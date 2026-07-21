import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityBase } from "@dsa/schema";
import { useDataStore } from "../store";

interface Props {
  category: string;
  placeholder?: string;
  /** Nur passende Einträge anbieten (z. B. Waffen: Feld "TP" vorhanden) */
  filter?: (entry: EntityBase) => boolean;
  /** Bereits gewählte IDs ausblenden */
  excludeIds?: string[];
  onPick: (entry: EntityBase) => void;
}

/** Suchfeld mit Trefferliste über eine Regeldaten-Kategorie. */
export function EntitySearchPicker({ category, placeholder, filter, excludeIds, onPick }: Props) {
  const loadCategory = useDataStore((s) => s.loadCategory);
  const entries = useDataStore((s) => s.categories[category]?.entries);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategory(category).catch(() => {
      /* fehlende Daten zeigt der Platzhalter an */
    });
  }, [category, loadCategory]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Stabiler Schlüssel, damit das Memo nicht bei jeder neuen excludeIds-Referenz neu rechnet.
  const excludeKey = (excludeIds ?? []).join("|");
  const matches = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    const excluded = new Set(excludeKey ? excludeKey.split("|") : []);
    // Alle Treffer anzeigen (die Liste ist scrollbar + per content-visibility performant),
    // nicht nur die ersten 12.
    return entries
      .filter((e) => !excluded.has(e.id))
      .filter((e) => !filter || filter(e))
      .filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [entries, query, filter, excludeKey]);

  return (
    <div className="picker" ref={wrapperRef}>
      <input
        value={query}
        placeholder={entries ? (placeholder ?? "Suchen und hinzufügen …") : "Keine Regeldaten geladen"}
        disabled={!entries}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <ul className="picker-results">
          {matches.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => {
                  onPick(entry);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {entry.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
