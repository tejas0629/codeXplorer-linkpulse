// Owner: Tejas | Task: TEJ-P1-10 | Priority: P1
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const campaignNames = ["Diwali Sale", "Newsletter", "Instagram Ads"] as const;
const tagNames = ["seasonal", "email", "social", "paid", "priority"] as const;
const codes = [
  "ok",
  "newsletter",
  "instagram",
  "mobile",
  "expired",
  "off",
  "admin-off",
  "limit",
  "secret",
  "gone",
  "launch",
  "support",
] as const;

export async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("Demo@1234", 10);
  const secretHash = await bcrypt.hash("secret123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@linkpulse.test" },
    create: {
      email: "admin@linkpulse.test",
      name: "LinkPulse Demo Admin",
      passwordHash,
      role: "ADMIN",
    },
    update: { name: "LinkPulse Demo Admin", passwordHash, role: "ADMIN" },
  });
  const user = await prisma.user.upsert({
    where: { email: "user@linkpulse.test" },
    create: {
      email: "user@linkpulse.test",
      name: "LinkPulse Demo User",
      passwordHash,
      role: "USER",
    },
    update: { name: "LinkPulse Demo User", passwordHash, role: "USER" },
  });

  await prisma.link.deleteMany({
    where: { ownerId: user.id, code: { in: [...codes] } },
  });
  await prisma.campaign.deleteMany({
    where: { ownerId: user.id, name: { in: [...campaignNames] } },
  });
  await prisma.campaign.createMany({
    data: campaignNames.map((name) => ({ name, ownerId: user.id })),
  });
  await prisma.tag.createMany({
    data: tagNames.map((name) => ({ name, ownerId: user.id })),
    skipDuplicates: true,
  });

  const campaigns = await prisma.campaign.findMany({
    where: { ownerId: user.id, name: { in: [...campaignNames] } },
    select: { id: true, name: true },
  });
  const tags = await prisma.tag.findMany({
    where: { ownerId: user.id, name: { in: [...tagNames] } },
    select: { id: true, name: true },
  });
  const campaignIds = new Map(campaigns.map((campaign) => [campaign.name, campaign.id]));
  const campaignForCode = [
    "Diwali Sale",
    "Newsletter",
    "Instagram Ads",
    "Instagram Ads",
    "Diwali Sale",
    "Newsletter",
    "Diwali Sale",
    "Diwali Sale",
    "Newsletter",
    "Instagram Ads",
    "Diwali Sale",
    "Newsletter",
  ] as const;
  const now = new Date();
  const linkData = codes.map((code, index) => ({
    code,
    destinationUrl: `https://example.com/demo/${code}`,
    ownerId: user.id,
    campaignId: campaignIds.get(campaignForCode[index]),
    status:
      code === "off"
        ? ("DISABLED" as const)
        : code === "admin-off"
          ? ("ADMIN_DISABLED" as const)
          : ("ACTIVE" as const),
    expiresAt: code === "expired" ? new Date(now.getTime() - 86_400_000) : null,
    maxClicks: code === "limit" ? 5 : null,
    passwordHash: code === "secret" ? secretHash : null,
    mobileUrl: code === "mobile" ? `https://m.example.com/demo/${code}` : null,
    deletedAt: code === "gone" ? new Date(now.getTime() - 3_600_000) : null,
  }));

  await prisma.link.createMany({ data: linkData });
  const links = await prisma.link.findMany({
    where: { code: { in: [...codes] } },
    select: { id: true, code: true },
  });
  const linkIds = new Map(links.map((link) => [link.code, link.id]));
  const linkTags = links.flatMap((link, index) => {
    const firstTag = tags[index % tags.length];
    const secondTag = tags[(index + 2) % tags.length];
    return firstTag && secondTag
      ? [
          { linkId: link.id, tagId: firstTag.id },
          { linkId: link.id, tagId: secondTag.id },
        ]
      : [];
  });
  await prisma.linkTag.createMany({ data: linkTags });

  const countries = ["IN", "IN", "IN", "IN", "US", "GB", "DE", "AE"];
  const devices = ["mobile", "mobile", "desktop", "tablet"];
  const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
  const operatingSystems = ["Android", "iOS", "Windows", "macOS", "Linux"];
  const referrers = [
    "https://instagram.com/",
    "https://google.com/",
    "https://twitter.com/",
  ];
  const visitorIds = Array.from({ length: 95 }, (_, index) =>
    createHash("sha256").update(`linkpulse-demo-visitor-${index}`).digest("hex"),
  );
  const successCounts = new Map(codes.map((code) => [code, 0]));
  const eventRows: Array<{
    linkId: string;
    createdAt: Date;
    referrer: string | null;
    deviceType: string;
    browser: string;
    os: string;
    country: string;
    isBot: boolean;
    visitorId: string;
    source: "LINK" | "QR";
    result: "SUCCESS" | "DISABLED" | "EXPIRED" | "LIMIT_REACHED";
  }> = [];

  for (let index = 0; index < 400; index += 1) {
    let code = codes[(index * 7) % codes.length];
    let result: "SUCCESS" | "DISABLED" | "EXPIRED" | "LIMIT_REACHED" = "SUCCESS";

    if (index % 100 === 0) {
      code = "expired";
      result = "EXPIRED";
    } else if (index % 100 === 1) {
      code = "off";
      result = "DISABLED";
    } else if (index % 100 === 2) {
      code = "limit";
      result = "LIMIT_REACHED";
    } else if (code === "expired" || code === "off" || code === "admin-off" || code === "gone") {
      code = codes[index % 4];
    }

    if (code === "limit" && result === "SUCCESS" && (successCounts.get(code) ?? 0) >= 5) {
      code = codes[index % 4];
    }

    const isBot = index % 10 === 0;
    if (!isBot && result === "SUCCESS") {
      successCounts.set(code, (successCounts.get(code) ?? 0) + 1);
    }

    const linkId = linkIds.get(code);
    const createdAt = new Date(now.getTime() - ((index * 37) % (14 * 24 * 60)) * 60_000);
    if (linkId) {
      eventRows.push({
        linkId,
        createdAt,
        referrer: index % 4 === 0 ? null : referrers[index % referrers.length],
        deviceType: devices[index % devices.length],
        browser: browsers[index % browsers.length],
        os: operatingSystems[index % operatingSystems.length],
        country: countries[index % countries.length],
        isBot,
        visitorId: visitorIds[index % visitorIds.length],
        source: index % 20 < 3 ? "QR" : "LINK",
        result,
      });
    }
  }

  for (const code of codes) {
    const clickCount = successCounts.get(code) ?? 0;
    await prisma.link.update({ where: { code }, data: { clickCount } });
  }

  for (let offset = 0; offset < eventRows.length; offset += 100) {
    await prisma.clickEvent.createMany({ data: eventRows.slice(offset, offset + 100) });
  }

  console.info(`Seeded demo users ${admin.email} and ${user.email}, ${codes.length} links, and ${eventRows.length} click events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
