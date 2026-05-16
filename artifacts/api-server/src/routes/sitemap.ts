import { Router } from "express";
import { db, techniciansTable } from "@workspace/db";

const router = Router();

const SITE_URL = "https://www.thankatech.com";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/browse", priority: "0.9", changefreq: "daily" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/browse/specialty/hvac", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/specialty/plumbing", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/specialty/electrical", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/specialty/appliance-repair", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/specialty/locksmith", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/specialty/pest-control", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/new-york-city", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/los-angeles", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/chicago", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/houston", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/phoenix", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/philadelphia", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/san-antonio", priority: "0.8", changefreq: "weekly" },
  { path: "/browse/city/san-diego", priority: "0.8", changefreq: "weekly" },
];

router.get("/sitemap.xml", async (req, res) => {
  try {
    const technicians = await db
      .select({ id: techniciansTable.id, createdAt: techniciansTable.createdAt })
      .from(techniciansTable);

    const now = new Date().toISOString().split("T")[0];

    const urls = [
      ...STATIC_PAGES.map(
        (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
      ),
      ...technicians.map(
        (t) => `  <url>
    <loc>${SITE_URL}/technician/${t.id}</loc>
    <lastmod>${t.createdAt?.toISOString().split("T")[0] ?? now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Error generating sitemap");
    res.status(500).send("Error generating sitemap");
  }
});

export default router;
