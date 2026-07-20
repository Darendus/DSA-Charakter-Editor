import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DataManifest } from "@dsa/schema";
import { CATEGORIES } from "./config";
import { HtmlCache } from "./lib/cache";
import { Fetcher } from "./lib/fetcher";
import { BASE_URL } from "./lib/util";
import { scrapeCategory, type CategoryResult, type ScrapeError } from "./pipeline";

export interface ScrapeRunOptions {
  /** Kategorie-Schlüssel; leer/undefined = alle */
  categories?: string[];
  /** höchstens n Einträge je Kategorie (Testläufe) */
  limit?: number;
  /** HTML-Cache ignorieren */
  force?: boolean;
  delayMs?: number;
  rawDir: string;
  outDir: string;
  onLog?: (line: string) => void;
  signal?: AbortSignal;
}

export interface ScrapeRunSummary {
  startedAt: string;
  finishedAt: string;
  aborted: boolean;
  categories: CategoryResult[];
  stats: { network: number; cached: number; failed: number };
}

export class UnknownCategoryError extends Error {}

export function categoryKeys(): string[] {
  return CATEGORIES.map((c) => c.key);
}

/**
 * Kompletter Scrape-Lauf als Bibliotheksfunktion - genutzt vom CLI und vom
 * Server (Scrape-Start aus der App). Schreibt Kategorie-JSONs, Manifest und
 * Fehlerbericht nach `outDir`.
 */
export async function runScrape(options: ScrapeRunOptions): Promise<ScrapeRunSummary> {
  const log = options.onLog ?? (() => {});
  const startedAt = new Date().toISOString();

  const selected = options.categories?.length
    ? CATEGORIES.filter((c) => options.categories!.includes(c.key))
    : CATEGORIES;
  if (options.categories?.length) {
    const unknown = options.categories.filter((key) => !CATEGORIES.some((c) => c.key === key));
    if (unknown.length) throw new UnknownCategoryError(`Unbekannte Kategorien: ${unknown.join(", ")}`);
  }

  const fetcher = new Fetcher({
    cache: new HtmlCache(options.rawDir),
    delayMs: options.delayMs ?? 400,
    force: options.force ?? false,
  });

  log(`Scrape von ${selected.length} Kategorie(n) nach ${options.outDir}`);
  const results: CategoryResult[] = [];
  const allErrors: Record<string, ScrapeError[]> = {};
  let aborted = false;

  for (const config of selected) {
    if (options.signal?.aborted) {
      aborted = true;
      break;
    }
    log(`[${config.key}] starte …`);
    const result = await scrapeCategory(config, fetcher, options.outDir, {
      limit: options.limit,
      signal: options.signal,
      log: (msg) => log(`[${config.key}] ${msg}`),
    });
    if (result.aborted) {
      aborted = true;
      log(`[${config.key}] abgebrochen (${result.count} Einträge verworfen)`);
      break;
    }
    results.push(result);
    if (result.errors.length) allErrors[config.key] = result.errors;
    log(
      `[${config.key}] fertig: ${result.count} Einträge aus ${result.pagesVisited} Seiten` +
        (result.errors.length ? `, ${result.errors.length} Fehler` : "")
    );
  }

  // Manifest aktualisieren (Teil-Läufe überschreiben nur ihre eigenen Kategorien)
  const manifestPath = join(options.outDir, "index.json");
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
  await mkdir(options.outDir, { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  // Fehlerbericht wie das Manifest je Kategorie mergen: gescrapte Kategorien
  // ersetzen ihren alten Eintrag (auch auf "keine Fehler"), fremde bleiben stehen.
  const errorsPath = join(options.outDir, "errors.json");
  let mergedErrors: Record<string, ScrapeError[]> = {};
  if (existsSync(errorsPath)) {
    try {
      mergedErrors = JSON.parse(await readFile(errorsPath, "utf8")) as Record<string, ScrapeError[]>;
    } catch {
      // beschädigter Bericht wird neu aufgebaut
    }
  }
  for (const result of results) {
    if (result.errors.length) mergedErrors[result.category] = result.errors;
    else delete mergedErrors[result.category];
  }
  if (Object.keys(mergedErrors).length) {
    await writeFile(errorsPath, JSON.stringify(mergedErrors, null, 2), "utf8");
    if (Object.keys(allErrors).length) log("Fehlerbericht: errors.json");
  } else if (existsSync(errorsPath)) {
    await rm(errorsPath);
  }

  const { network, cached, failed } = fetcher.stats;
  log(
    (aborted ? "Abgebrochen" : "Fertig") +
      ` - Requests: ${network} Netz / ${cached} Cache / ${failed} fehlgeschlagen`
  );

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    aborted,
    categories: results,
    stats: fetcher.stats,
  };
}
