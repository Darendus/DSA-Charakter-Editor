import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DataManifest } from "@dsa/schema";
import { CATEGORIES } from "./config";
import { HtmlCache } from "./lib/cache";
import { Fetcher } from "./lib/fetcher";
import { BASE_URL } from "./lib/util";
import { scrapeCategory, type ScrapeError } from "./pipeline";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const RAW_DIR = join(REPO_ROOT, "data", "raw");
const OUT_DIR = join(REPO_ROOT, "data", "json");

interface CliOptions {
  categories?: string[];
  limit?: number;
  force: boolean;
  delayMs: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { force: false, delayMs: 400 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--category" || arg === "-c") {
      opts.categories = [...(opts.categories ?? []), ...argv[++i]!.split(/[,\s]+/).filter(Boolean)];
    } else if (arg === "--limit" || arg === "-l") {
      opts.limit = parseInt(argv[++i]!, 10);
    } else if (arg === "--force" || arg === "-f") {
      opts.force = true;
    } else if (arg === "--delay") {
      opts.delayMs = parseInt(argv[++i]!, 10);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unbekanntes Argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`Regelwiki-Scraper — lädt ${BASE_URL} in lokale JSON-Dateien

Aufruf: npm run scrape [-- Optionen]

  --category, -c <a,b,…>  nur diese Kategorien (Standard: alle)
  --limit, -l <n>         höchstens n Einträge je Kategorie (zum Testen)
  --force, -f             HTML-Cache ignorieren, neu herunterladen
  --delay <ms>            Pause zwischen Netz-Requests (Standard: 400)

Kategorien: ${CATEGORIES.map((c) => c.key).join(", ")}`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const selected = opts.categories
    ? CATEGORIES.filter((c) => opts.categories!.includes(c.key))
    : CATEGORIES;
  if (opts.categories) {
    const unknown = opts.categories.filter((key) => !CATEGORIES.some((c) => c.key === key));
    if (unknown.length) {
      console.error(`Unbekannte Kategorien: ${unknown.join(", ")}`);
      process.exit(1);
    }
  }

  const fetcher = new Fetcher({
    cache: new HtmlCache(RAW_DIR),
    delayMs: opts.delayMs,
    force: opts.force,
  });

  console.log(`Scrape von ${selected.length} Kategorie(n) nach ${OUT_DIR}`);
  const started = Date.now();
  const allErrors: Record<string, ScrapeError[]> = {};
  const results = [];

  for (const config of selected) {
    console.log(`\n[${config.key}] starte …`);
    const result = await scrapeCategory(config, fetcher, OUT_DIR, {
      limit: opts.limit,
      log: (msg) => console.log(`[${config.key}] ${msg}`),
    });
    results.push(result);
    if (result.errors.length) allErrors[config.key] = result.errors;
    console.log(
      `[${config.key}] fertig: ${result.count} Einträge aus ${result.pagesVisited} Seiten` +
        (result.errors.length ? `, ${result.errors.length} Fehler` : "")
    );
  }

  // Manifest aktualisieren (Teil-Läufe überschreiben nur ihre eigenen Kategorien)
  const manifestPath = join(OUT_DIR, "index.json");
  let manifest: DataManifest = { scrapedAt: "", source: BASE_URL, categories: [] };
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8")) as DataManifest;
    } catch {
      // beschädigtes Manifest wird neu aufgebaut
    }
  }
  for (const result of results) {
    const entry = {
      category: result.category,
      file: result.file,
      count: result.count,
      errors: result.errors.length,
    };
    const idx = manifest.categories.findIndex((c) => c.category === result.category);
    if (idx >= 0) manifest.categories[idx] = entry;
    else manifest.categories.push(entry);
  }
  manifest.scrapedAt = new Date().toISOString();
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  if (Object.keys(allErrors).length) {
    await writeFile(join(OUT_DIR, "errors.json"), JSON.stringify(allErrors, null, 2), "utf8");
    console.log(`\nFehlerbericht: data/json/errors.json`);
  }

  const seconds = Math.round((Date.now() - started) / 1000);
  const { network, cached, failed } = fetcher.stats;
  console.log(
    `\nFertig in ${seconds}s — Requests: ${network} Netz / ${cached} Cache / ${failed} fehlgeschlagen`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
