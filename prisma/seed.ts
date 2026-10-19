// Owner: Tejas | Task: TEJ-P1-10 | Priority: P1
import { PrismaClient } from "@prisma/client";

// TODO (TEJ): Seed database with sample users (USER, ADMIN), campaigns, links, tags, and realistic clicks over 30 days
const prisma = new PrismaClient();

export async function main(): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: TEJ-P1-10");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
