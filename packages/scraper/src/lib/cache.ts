import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface CacheEntry {
  url: string;
  fetchedAt: string;
  status: number;
  html: string;
}

/**
 * Datei-Cache für heruntergeladene Seiten unter data/raw/.
 * Schlüssel ist der SHA1 der URL; die Datei enthält URL + Zeitstempel,
 * damit der Cache selbstbeschreibend bleibt.
 */
export class HtmlCache {
  constructor(private readonly dir: string) {}

  private pathFor(url: string): string {
    const hash = createHash("sha1").update(url).digest("hex");
    return join(this.dir, `${hash}.json`);
  }

  async get(url: string): Promise<CacheEntry | undefined> {
    const file = this.pathFor(url);
    if (!existsSync(file)) return undefined;
    try {
      return JSON.parse(await readFile(file, "utf8")) as CacheEntry;
    } catch {
      return undefined;
    }
  }

  async put(url: string, status: number, html: string): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const entry: CacheEntry = { url, fetchedAt: new Date().toISOString(), status, html };
    await writeFile(this.pathFor(url), JSON.stringify(entry), "utf8");
  }
}
