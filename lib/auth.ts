// Owner: Milan | Task: MIL-P1-2, MIL-P1-3 | Priority: P1
import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import type { SessionUser, RegisterResponse } from "@/types/api";

const BCRYPT_ROUNDS = 10;

export const registerSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ message: "Email is required" })
    .trim()
    .toLowerCase()
    .max(150, "Email cannot exceed 150 characters")
    .pipe(z.email("Email must be a valid email address")),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(150).pipe(z.email()),
  password: z.string().min(1).max(72),
});

/**
 * Creates a credentials account. Passwords are stored only as bcrypt hashes.
 * New accounts always get the USER role; any role in the input is ignored.
 */
export async function registerUser(input: unknown): Promise<RegisterResponse> {
  const data = registerSchema.parse(input);

  const existing = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    throw emailExists();
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  try {
    const user = await db.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { ...user, createdAt: user.createdAt.toISOString() };
  } catch (err: unknown) {
    // Two concurrent registrations for the same email: the unique index wins.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw emailExists();
    }
    throw err;
  }
}

function emailExists(): ApiError {
  return new ApiError("EMAIL_EXISTS", "An account with this email already exists", 409, {
    email: "An account with this email already exists",
  });
}

// Hash compared against when the email is unknown, so a failed login takes
// about the same time whether or not the account exists.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash("linkpulse-timing-equalizer", BCRYPT_ROUNDS);
  return dummyHashPromise;
}

/**
 * Verifies an email and password pair. Returns the user on success and null
 * on any failure, without revealing which part was wrong.
 */
export async function verifyCredentials(input: unknown): Promise<SessionUser | null> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true, image: true, role: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    // Unknown email, or an account that only signs in with Google.
    await bcrypt.compare(parsed.data.password, await getDummyHash());
    return null;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return null;
  }

  const { passwordHash: _passwordHash, ...sessionUser } = user;
  void _passwordHash;
  return sessionUser;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => verifyCredentials(credentials),
    }),
    // Reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
    Google,
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user is only present on sign-in; it comes from verifyCredentials or,
      // for Google, from the database row created by the Prisma adapter.
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        session.user.role = token.role ?? "USER";
      }
      return session;
    },
  },
});
