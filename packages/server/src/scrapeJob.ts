import { runScrape, type ScrapeRunSummary } from "@dsa/scraper";

const LOG_LIMIT = 200;

export interface ScrapeJobStatus {
  running: boolean;
  startedAt?: string;
  finishedAt?: string;
  log: string[];
  summary?: ScrapeRunSummary;
  error?: string;
}

/**
 * Höchstens ein Scrape-Lauf zur Zeit; Log als Ringpuffer,
 * damit das Frontend den Fortschritt pollen kann.
 */
export class ScrapeJobManager {
  private controller?: AbortController;
  private status: ScrapeJobStatus = { running: false, log: [] };

  constructor(private readonly dirs: { rawDir: string; outDir: string }) {}

  getStatus(): ScrapeJobStatus {
    return this.status;
  }

  /** Startet einen Lauf; false, wenn bereits einer aktiv ist. */
  start(options: { categories?: string[]; force?: boolean; limit?: number }): boolean {
    if (this.status.running) return false;

    this.controller = new AbortController();
    this.status = { running: true, startedAt: new Date().toISOString(), log: [] };

    const pushLog = (line: string) => {
      this.status.log.push(line);
      if (this.status.log.length > LOG_LIMIT) this.status.log.shift();
    };

    void runScrape({
      categories: options.categories,
      force: options.force,
      limit: options.limit,
      rawDir: this.dirs.rawDir,
      outDir: this.dirs.outDir,
      onLog: pushLog,
      signal: this.controller.signal,
    })
      .then((summary) => {
        this.status = { ...this.status, running: false, finishedAt: new Date().toISOString(), summary };
      })
      .catch((error: unknown) => {
        pushLog(`FEHLER: ${error instanceof Error ? error.message : String(error)}`);
        this.status = {
          ...this.status,
          running: false,
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        };
      });

    return true;
  }

  /** Bricht den laufenden Lauf ab; false, wenn keiner läuft. */
  cancel(): boolean {
    if (!this.status.running || !this.controller) return false;
    this.controller.abort();
    return true;
  }
}
