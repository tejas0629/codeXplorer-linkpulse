// Owner: Chirag | Task: CHI-P1-8 | Priority: P1
import { PrismaClient, ClickSource, ClickResult } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Safety checks
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed: NODE_ENV is set to production.");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.toLowerCase().includes("prod")) {
    console.error(
      "Refusing to seed: DATABASE_URL appears to point to a production database."
    );
    process.exit(1);
  }

  const userId = process.env.DEV_FAKE_USER_ID || "dev-fake-user-1";
  console.log(`Starting dev click seed for user: ${userId}`);

  // Ensure user exists
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: "dev@example.com",
      name: "Dev Fake User",
      role: "USER",
    },
  });

  // Target 5 links
  const now = new Date();
  const expiringIn24h = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 60000);

  const linkConfigs = [
    {
      code: "demo-launch-2026",
      destinationUrl: "https://company.org/product-launch",
      maxClicks: null,
      expiresAt: null,
      targetClicks: 750,
    },
    {
      code: "demo-summer-sale",
      destinationUrl: "https://company.org/deals/summer",
      maxClicks: 500,
      expiresAt: null,
      targetClicks: 485, // 97% of limit (WARNING alert)
    },
    {
      code: "demo-beta-invite",
      destinationUrl: "https://company.org/beta",
      maxClicks: 100,
      expiresAt: null,
      targetClicks: 98, // 98% of limit (CRITICAL alert)
    },
    {
      code: "demo-webinar-24h",
      destinationUrl: "https://company.org/webinar",
      maxClicks: null,
      expiresAt: expiringIn24h, // Expiring in 24h alert
      targetClicks: 320,
    },
    {
      code: "demo-press-release",
      destinationUrl: "https://company.org/news/oct-announcement",
      maxClicks: null,
      expiresAt: null,
      targetClicks: 350,
    },
  ];

  const links: Record<string, { id: string; code: string; targetClicks: number }> =
    {};

  for (const config of linkConfigs) {
    const link = await prisma.link.upsert({
      where: { code: config.code },
      update: {
        destinationUrl: config.destinationUrl,
        maxClicks: config.maxClicks,
        expiresAt: config.expiresAt,
        deletedAt: null,
      },
      create: {
        code: config.code,
        destinationUrl: config.destinationUrl,
        ownerId: userId,
        status: "ACTIVE",
        maxClicks: config.maxClicks,
        expiresAt: config.expiresAt,
      },
    });
    links[config.code] = {
      id: link.id,
      code: link.code,
      targetClicks: config.targetClicks,
    };
  }

  // Check idempotency
  const linkIds = Object.values(links).map((l) => l.id);
  const existingClicks = await prisma.clickEvent.count({
    where: { linkId: { in: linkIds } },
  });

  if (existingClicks >= 1500) {
    console.log(
      `Idempotent check: found ${existingClicks} existing clicks for demo links. Skipping click re-seeding.`
    );
    printSummary(5, existingClicks);
    return;
  }

  // Clear existing clicks on demo links to ensure clean state
  if (existingClicks > 0) {
    await prisma.clickEvent.deleteMany({
      where: { linkId: { in: linkIds } },
    });
  }

  // Distributions
  const devices = [
    { name: "desktop", weight: 55 },
    { name: "mobile", weight: 38 },
    { name: "tablet", weight: 7 },
  ];

  const browsers = [
    { name: "Chrome", weight: 60 },
    { name: "Safari", weight: 22 },
    { name: "Firefox", weight: 12 },
    { name: "Edge", weight: 6 },
  ];

  const countries = ["US", "IN", "GB", "DE", "CA"];
  const referrers = [
    null, // direct
    "https://twitter.com",
    "https://linkedin.com",
    "https://github.com",
    "https://reddit.com",
  ];

  function pickWeighted<T extends { weight: number }>(items: T[]): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * total;
    for (const item of items) {
      if (rand < item.weight) return item;
      rand -= item.weight;
    }
    return items[0];
  }

  function pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  const visitorPool: string[] = [];
  for (let i = 0; i < 1200; i++) {
    visitorPool.push(`v_hash_${String(i).padStart(4, "0")}`);
  }

  const clickRecords: Array<{
    linkId: string;
    createdAt: Date;
    referrer: string | null;
    deviceType: string;
    browser: string;
    os: string;
    country: string;
    isBot: boolean;
    visitorId: string;
    source: ClickSource;
    result: ClickResult;
  }> = [];

  let totalBots = 0;
  let totalQr = 0;

  for (const config of linkConfigs) {
    const link = links[config.code];
    const totalToGenerate = config.targetClicks;

    for (let i = 0; i < totalToGenerate; i++) {
      // 30 day range distribution
      // Spike day: For demo-launch-2026, 80 clicks happen today (or within last 12 hours)
      let daysAgo: number;
      if (config.code === "demo-launch-2026" && i < 80) {
        // Today spike
        daysAgo = 0;
      } else {
        daysAgo = Math.floor(Math.random() * 30);
      }

      const timestamp = new Date(
        now.getTime() -
          daysAgo * 24 * 60 * 60 * 1000 -
          Math.floor(Math.random() * 24 * 60 * 60 * 1000)
      );

      // ~10% bots
      const isBot = Math.random() < 0.1;
      if (isBot) totalBots++;

      // ~15% QR sources
      const isQr = Math.random() < 0.15;
      const source: ClickSource = isQr ? "QR" : "LINK";
      if (isQr) totalQr++;

      const device = pickWeighted(devices).name;
      const browser = pickWeighted(browsers).name;
      const os =
        device === "mobile"
          ? pickRandom(["iOS", "Android"])
          : pickRandom(["Windows", "macOS", "Linux"]);
      const country = pickRandom(countries);
      const referrer = pickRandom(referrers);
      const visitorId = pickRandom(visitorPool);

      clickRecords.push({
        linkId: link.id,
        createdAt: timestamp,
        referrer,
        deviceType: device,
        browser,
        os,
        country,
        isBot,
        visitorId,
        source,
        result: "SUCCESS",
      });
    }
  }

  // Batch insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < clickRecords.length; i += chunkSize) {
    const chunk = clickRecords.slice(i, i + chunkSize);
    await prisma.clickEvent.createMany({ data: chunk });
  }

  // Update clickCount on each link
  for (const config of linkConfigs) {
    const count = await prisma.clickEvent.count({
      where: { linkId: links[config.code].id, result: "SUCCESS" },
    });
    await prisma.link.update({
      where: { id: links[config.code].id },
      data: { clickCount: count },
    });
  }

  printSummary(linkConfigs.length, clickRecords.length, totalBots, totalQr);
}

function printSummary(
  linksCount: number,
  clicksCount: number,
  botsCount: number = 0,
  qrCount: number = 0
) {
  console.log("-----------------------------------------");
  console.log("Dev Click Seed Completed Successfully");
  console.log(`- Links processed: ${linksCount}`);
  console.log(`- Clicks created: ${clicksCount}`);
  if (botsCount > 0) {
    console.log(
      `- Bot clicks: ${botsCount} (${((botsCount / clicksCount) * 100).toFixed(1)}%)`
    );
    console.log(
      `- QR scans: ${qrCount} (${((qrCount / clicksCount) * 100).toFixed(1)}%)`
    );
  }
  console.log("Configured Alerts:");
  console.log("  * demo-summer-sale: ~485 / 500 max clicks (97% limit)");
  console.log("  * demo-beta-invite: ~98 / 100 max clicks (98% limit)");
  console.log("  * demo-webinar-24h: Expires in less than 24 hours");
  console.log("  * demo-launch-2026: 80 clicks spike today");
  console.log("-----------------------------------------");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
