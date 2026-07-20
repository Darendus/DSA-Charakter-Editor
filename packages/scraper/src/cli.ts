import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL } from "./lib/util";
import { categoryKeys, runScrape, UnknownCategoryError } from "./run";

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
  console.log(`Regelwiki-Scraper - lädt ${BASE_URL} in lokale JSON-Dateien

Aufruf: npm run scrape [-- Optionen]

  --category, -c <a,b,…>  nur diese Kategorien (Standard: alle)
  --limit, -l <n>         höchstens n Einträge je Kategorie (zum Testen)
  --force, -f             HTML-Cache ignorieren, neu herunterladen
  --delay <ms>            Pause zwischen Netz-Requests (Standard: 400)

Kategorien: ${categoryKeys().join(", ")}`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const started = Date.now();
  try {
    await runScrape({
      categories: opts.categories,
      limit: opts.limit,
      force: opts.force,
      delayMs: opts.delayMs,
      rawDir: RAW_DIR,
      outDir: OUT_DIR,
      onLog: (line) => console.log(line),
    });
  } catch (error) {
    if (error instanceof UnknownCategoryError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
  console.log(`Dauer: ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
