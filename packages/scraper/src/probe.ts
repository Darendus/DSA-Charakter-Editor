// Diagnose-Helfer: parst einzelne URLs und zeigt das Ergebnis.
// Aufruf: npx tsx packages/scraper/src/probe.ts <url> [<url> …]
import { HtmlCache } from "./lib/cache";
import { Fetcher } from "./lib/fetcher";
import { parsePage } from "./lib/page";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAW_DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), "../../.."), "data", "raw");

const fetcher = new Fetcher({ cache: new HtmlCache(RAW_DIR) });

for (const url of process.argv.slice(2)) {
  try {
    const { html, fromCache } = await fetcher.get(url);
    const page = parsePage(html, url);
    console.log(`\n=== ${url} (cache: ${fromCache})`);
    console.log(`kind=${page.kind} title=${JSON.stringify(page.title)}`);
    console.log(`fields: ${Object.keys(page.fields).join(", ") || "-"}`);
    console.log(`navLinks=${page.navLinks.length} queryLinks=${page.queryLinks.length}`);
    console.log(`description: ${(page.description ?? "").slice(0, 120)}`);
  } catch (error) {
    console.log(`\n=== ${url}\nFEHLER: ${String(error)}`);
  }
}
