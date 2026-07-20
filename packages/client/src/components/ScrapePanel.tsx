import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ScrapeStatus } from "../api";
import { useDataStore } from "../store";

const POLL_MS = 2000;

/** Steuerung des Regelwiki-Scrapers aus der App heraus (Start, Log, Abbruch). */
export function ScrapePanel() {
  const reset = useDataStore((s) => s.reset);
  const [status, setStatus] = useState<ScrapeStatus>();
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string>();
  const wasRunning = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api.scrapeStatus();
      setStatus(next);
      if (wasRunning.current && !next.running) {
        // Lauf gerade beendet → Regeldaten-Cache neu aufbauen
        wasRunning.current = false;
        void reset();
      }
      if (next.running) wasRunning.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [reset]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!status?.running) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [status?.running, refresh]);

  const start = async () => {
    setError(undefined);
    try {
      setStatus(await api.startScrape({ force }));
      wasRunning.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const cancel = async () => {
    try {
      await api.cancelScrape();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const logTail = status?.log.slice(-12) ?? [];

  return (
    <section className="scrape-panel">
      <div className="scrape-controls">
        <button className="primary" onClick={() => void start()} disabled={status?.running}>
          {status?.running ? "Scraper läuft …" : "Regeldaten aktualisieren"}
        </button>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={force}
            disabled={status?.running}
            onChange={(e) => setForce(e.target.checked)}
          />
          Cache ignorieren (alles neu laden - dauert ~1 Stunde)
        </label>
        {status?.running && (
          <button className="danger" onClick={() => void cancel()}>
            Abbrechen
          </button>
        )}
        {error && <span className="error">{error}</span>}
      </div>

      {(status?.running || logTail.length > 0) && (
        <pre className="scrape-log">{logTail.join("\n") || "Starte …"}</pre>
      )}
      {status && !status.running && status.finishedAt && (
        <p className="muted small">
          Letzter Lauf beendet {new Date(status.finishedAt).toLocaleString("de-DE")}
          {status.summary?.aborted ? " (abgebrochen)" : ""}
          {status.error ? ` - Fehler: ${status.error}` : ""}
        </p>
      )}
    </section>
  );
}
