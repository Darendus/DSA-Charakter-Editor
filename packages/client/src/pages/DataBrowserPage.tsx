import { useEffect, useMemo, useState } from "react";
import type { EntityBase } from "@dsa/schema";
import { ScrapePanel } from "../components/ScrapePanel";
import { useDataStore } from "../store";

export function DataBrowserPage() {
  const { manifest, manifestError, loadManifest, loadCategory, categories, dataVersion } =
    useDataStore();
  const [category, setCategory] = useState<string>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EntityBase>();

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  // dataVersion in den Deps: nach einem Scrape-Lauf (reset leert den Cache und
  // erhöht dataVersion) wird die aktuelle Kategorie neu geladen statt leer zu bleiben.
  useEffect(() => {
    if (category) {
      setSelected(undefined);
      loadCategory(category).catch(() => {
        /* Fehler zeigt die Liste an */
      });
    }
  }, [category, loadCategory, dataVersion]);

  const entries = category ? (categories[category]?.entries ?? []) : [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, search]);

  if (manifestError) {
    return (
      <div className="page">
        <h1>Regeldaten</h1>
        <p className="error">{manifestError}</p>
        <ScrapePanel />
      </div>
    );
  }

  return (
    <div className="page browser">
      <h1>Regeldaten</h1>
      <ScrapePanel />
      <div className="browser-controls">
        <select value={category ?? ""} onChange={(e) => setCategory(e.target.value || undefined)}>
          <option value="">– Kategorie wählen –</option>
          {(manifest?.categories ?? []).map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>
        <input
          placeholder="Suchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={!category}
        />
      </div>

      <div className="browser-layout">
        <ul className="browser-list">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <button
                className={selected?.id === entry.id ? "active" : ""}
                onClick={() => setSelected(entry)}
              >
                {entry.name}
              </button>
            </li>
          ))}
          {category && filtered.length === 0 && <li className="muted">Keine Treffer.</li>}
        </ul>

        <div className="browser-detail">
          {selected ? (
            <>
              <h2>{selected.name}</h2>
              {Object.keys(selected.fields).length > 0 && (
                <table className="table fields">
                  <tbody>
                    {Object.entries(selected.fields).map(([label, value]) => (
                      <tr key={label}>
                        <th>{label}</th>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selected.tables?.map((table, tableIndex) => (
                <div key={tableIndex} className="table-scroll">
                  <table className="table data-table">
                    <thead>
                      <tr>
                        {table.headers.map((header, i) => (
                          <th key={i}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {selected.description && <p className="pre-wrap">{selected.description}</p>}
              {selected.publications && selected.publications.length > 0 && (
                <p className="muted small">Publikation: {selected.publications.join(" · ")}</p>
              )}
              <p>
                <a href={selected.url} target="_blank" rel="noreferrer">
                  Im Regelwiki öffnen ↗
                </a>
              </p>
            </>
          ) : (
            <p className="muted">Wähle links einen Eintrag.</p>
          )}
        </div>
      </div>
    </div>
  );
}
