import { HtmlCache } from "./cache";
import { sleep } from "./util";

const USER_AGENT =
  "DSA-Charakter-Editor-Scraper/0.1 (privater Gebrauch; lokale Charakterverwaltung)";

export interface FetchResult {
  url: string;
  html: string;
  fromCache: boolean;
}

export interface FetcherOptions {
  cache: HtmlCache;
  /** Pause zwischen echten Netz-Requests (nicht bei Cache-Treffern) */
  delayMs?: number;
  /** Cache ignorieren und neu laden */
  force?: boolean;
  retries?: number;
}

/** Höflicher, sequenzieller Fetcher mit Datei-Cache, Drosselung und Backoff. */
export class Fetcher {
  private lastRequestAt = 0;
  stats = { network: 0, cached: 0, failed: 0 };

  constructor(private readonly opts: FetcherOptions) {}

  async get(url: string, signal?: AbortSignal): Promise<FetchResult> {
    if (!this.opts.force) {
      const cached = await this.opts.cache.get(url);
      if (cached && cached.status === 200) {
        this.stats.cached++;
        return { url, html: cached.html, fromCache: true };
      }
    }

    const delay = this.opts.delayMs ?? 400;
    const retries = this.opts.retries ?? 3;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const sinceLast = Date.now() - this.lastRequestAt;
      if (sinceLast < delay) await sleep(delay - sinceLast);
      this.lastRequestAt = Date.now();

      try {
        // Timeout und (optionaler) Abbruch-Signal des Scrape-Laufs kombinieren,
        // damit ein laufender Download beim Abbrechen sofort endet.
        const timeout = AbortSignal.timeout(30_000);
        const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, "Accept-Language": "de" },
          redirect: "follow",
          signal: combined,
        });
        if (response.status === 200) {
          const html = await response.text();
          this.stats.network++;
          await this.opts.cache.put(url, response.status, html);
          return { url, html, fromCache: false };
        }
        lastError = new Error(`HTTP ${response.status}`);
        // 4xx nicht wiederholen - die Seite existiert schlicht nicht
        if (response.status >= 400 && response.status < 500) break;
      } catch (error) {
        lastError = error;
        // Vom Nutzer abgebrochen: nicht erneut versuchen
        if (signal?.aborted) break;
      }
      await sleep(1000 * 2 ** attempt);
    }

    this.stats.failed++;
    throw new Error(`Abruf fehlgeschlagen: ${url} (${String(lastError)})`);
  }
}
