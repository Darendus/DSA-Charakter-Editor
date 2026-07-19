import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EntityBaseSchema, type CategoryFile, type EntityBase } from "@dsa/schema";
import type { CategoryConfig } from "./config";
import { GLOBAL_EXCLUDE, queryEndpointOwner } from "./config";
import type { Fetcher } from "./lib/fetcher";
import { parsePage } from "./lib/page";
import { refineEntity } from "./refine";
import { BASE_URL, cleanText, resolveUrl, slugify } from "./lib/util";

export interface ScrapeError {
  url: string;
  reason: string;
}

export interface CategoryResult {
  category: string;
  file: string;
  count: number;
  pagesVisited: number;
  errors: ScrapeError[];
}

interface QueueItem {
  url: string;
  depth: number;
}

function isExcluded(url: string, config: CategoryConfig): boolean {
  if ([...GLOBAL_EXCLUDE, ...(config.exclude ?? [])].some((re) => re.test(url))) return true;

  // Fremde Detail-Endpunkte (zauber.html?…, vorteil.html?… in anderen Kategorien) meiden
  const endpoint = url.match(/\/([^/?]+\.html)\?/);
  if (endpoint) {
    const owner = queryEndpointOwner(decodeURIComponent(endpoint[1]!).toLowerCase());
    if (owner && owner !== config.key) return true;
  }
  return false;
}

export async function scrapeCategory(
  config: CategoryConfig,
  fetcher: Fetcher,
  outDir: string,
  options: { limit?: number; log?: (msg: string) => void } = {}
): Promise<CategoryResult> {
  const log = options.log ?? (() => {});
  const maxDepth = config.maxDepth ?? 6;

  // Zusätzliche Wurzeln (Index 1+) zählen als Unterseiten (depth 1),
  // damit sie — anders als die Sektions-Startseite — Einträge werden können.
  const queue: QueueItem[] = config.roots
    .map((root) => resolveUrl(root, BASE_URL))
    .filter((url): url is string => Boolean(url))
    .map((url, index) => ({ url, depth: index === 0 ? 0 : 1 }));
  const visited = new Set<string>(queue.map((item) => item.url));

  const entries: EntityBase[] = [];
  const errors: ScrapeError[] = [];
  const usedIds = new Set<string>();
  let pagesVisited = 0;

  while (queue.length > 0) {
    if (options.limit && entries.length >= options.limit) break;
    const { url, depth } = queue.shift()!;

    let html: string;
    try {
      const result = await fetcher.get(url);
      html = result.html;
    } catch (error) {
      errors.push({ url, reason: String(error) });
      continue;
    }
    pagesVisited++;

    let page;
    try {
      page = parsePage(html, url);
    } catch (error) {
      errors.push({ url, reason: `Parse-Fehler: ${String(error)}` });
      continue;
    }

    // Eintrag übernehmen, wenn die Seite echten Inhalt hat.
    // Wurzel-/Indexseiten (kind: "empty") werden nur zum Weiterkrabbeln genutzt;
    // Auswahl-/Listenseiten (viele Query-Links, keine Felder) ebenfalls.
    const isListPage = page.queryLinks.length >= 5 && Object.keys(page.fields).length === 0;
    // Sektions-Wurzeln (spezies.html …) sind Übersichten, keine Einträge
    const isSectionRoot = config.crawlNav && depth === 0;
    const isEntryPage = page.kind !== "empty" && !isListPage && !isSectionRoot;
    if (isEntryPage && page.title) {
      let id = slugify(page.title) || slugify(url);
      while (usedIds.has(id)) id = `${id}-x`;
      usedIds.add(id);

      const candidate: EntityBase = {
        id,
        name: cleanText(page.title),
        category: config.key,
        url,
        fields: page.fields,
        description: page.description,
        publications: page.publications.length ? page.publications : undefined,
        scrapedAt: new Date().toISOString(),
      };
      const validation = EntityBaseSchema.safeParse(candidate);
      if (validation.success) {
        entries.push(validation.data);
        if (entries.length % 25 === 0) log(`${entries.length} Einträge …`);
      } else {
        errors.push({ url, reason: validation.error.message });
      }
    }

    // Frontier erweitern. Query-Links werden nur von Listen-/Indexseiten und
    // von Auswahl-Wurzeln verfolgt — Detailseiten verlinken quer in andere
    // Kategorien (z. B. Spezies → Vorteile) und würden diese sonst verschmutzen.
    const followQueryLinks =
      isListPage || page.kind === "empty" || (depth === 0 && !config.crawlNav);
    const nextLinks: string[] = followQueryLinks ? [...page.queryLinks] : [];
    if (config.crawlNav && depth < maxDepth) nextLinks.push(...page.navLinks);

    for (const link of nextLinks) {
      if (visited.has(link) || isExcluded(link, config)) continue;
      visited.add(link);
      queue.push({ url: link, depth: depth + 1 });
    }
  }

  const refined = entries.map(refineEntity);

  const fileName = `${config.key}.json`;
  const payload: CategoryFile = {
    category: config.key,
    source: resolveUrl(config.roots[0]!, BASE_URL)!,
    scrapedAt: new Date().toISOString(),
    count: refined.length,
    entries: refined,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, fileName), JSON.stringify(payload, null, 2), "utf8");

  return { category: config.key, file: fileName, count: refined.length, pagesVisited, errors };
}
