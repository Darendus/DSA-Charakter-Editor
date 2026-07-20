import { useState } from "react";
import type { EntityBase } from "@dsa/schema";
import { useCharacterStore, useDataStore } from "../store";
import { useApBudget } from "../useApBudget";

interface PickerProps {
  label: string;
  category: string;
  value?: { id: string; name: string };
  onChange: (ref?: { id: string; name: string }) => void;
  showAp: boolean;
  /** Freie AP; Auswahl wird geblockt, wenn die Differenz das Budget sprengt */
  remaining?: number;
}

function EntityPicker({ label, category, value, onChange, showAp, remaining }: PickerProps) {
  const entries = useDataStore((s) => s.categories[category]?.entries);
  const [error, setError] = useState<string>();

  const apById = (id: string | undefined): number => {
    if (!id) return 0;
    const entry = entries?.find((e: EntityBase) => e.id === id) as { ap?: number } | undefined;
    return entry?.ap ?? 0;
  };

  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value?.id ?? ""}
        onChange={(e) => {
          const entry = entries?.find((entity: EntityBase) => entity.id === e.target.value);
          const delta = apById(entry?.id) - apById(value?.id);
          if (remaining !== undefined && delta > remaining) {
            setError(`Nicht genug AP (${delta} nötig, ${remaining} frei)`);
            return;
          }
          setError(undefined);
          onChange(entry ? { id: entry.id, name: entry.name } : undefined);
        }}
      >
        <option value="">– nicht gewählt –</option>
        {(entries ?? []).map((entry: EntityBase & { ap?: number }) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
            {showAp && entry.ap !== undefined ? ` (${entry.ap} AP)` : ""}
          </option>
        ))}
      </select>
      {error && <span className="error small">{error}</span>}
      {!entries && <span className="muted small">Keine Daten - `npm run scrape` ausführen?</span>}
    </label>
  );
}

export function GrunddatenTab() {
  const { current, update } = useCharacterStore();
  const budget = useApBudget(current);
  const [apToAdd, setApToAdd] = useState("");
  if (!current) return null;

  const remaining = current.useAp ? budget.remaining : undefined;

  const addAp = () => {
    const amount = parseInt(apToAdd, 10);
    if (!amount) return;
    // Nie unter die bereits ausgegebenen AP (und nie unter 0) senken
    const newTotal = Math.max(budget.total, Math.max(0, current.apTotal + amount));
    update({ apTotal: newTotal });
    setApToAdd("");
  };

  return (
    <div className="form-grid">
      <label className="field">
        <span>Name</span>
        <input value={current.name} onChange={(e) => update({ name: e.target.value })} />
      </label>

      <label className="field">
        <span>Spieler:in</span>
        <input value={current.player ?? ""} onChange={(e) => update({ player: e.target.value })} />
      </label>

      <label className="field">
        <span>Punktesystem</span>
        <label className="checkbox" title="Für Homebrew-Systeme mit eigener Werteverteilung">
          <input
            type="checkbox"
            checked={!current.useAp}
            onChange={(e) => update({ useAp: !e.target.checked })}
          />
          Ohne AP spielen (Homebrew)
        </label>
      </label>

      {current.useAp && (
        <>
          <label className="field">
            <span>AP gesamt</span>
            <div className="ap-total">
              <strong>{current.apTotal} AP</strong>
              <span className="muted small">
                ausgegeben: {budget.total} · frei: {budget.remaining}
              </span>
            </div>
          </label>

          <label className="field">
            <span>AP hinzufügen (z. B. Abenteuer-Belohnung)</span>
            <div className="ap-add">
              <input
                type="number"
                placeholder="z. B. 25"
                value={apToAdd}
                onChange={(e) => setApToAdd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAp()}
              />
              <button onClick={addAp} disabled={!parseInt(apToAdd, 10)}>
                Hinzufügen
              </button>
            </div>
          </label>
        </>
      )}

      <EntityPicker
        label="Spezies"
        category="spezies"
        value={current.species}
        onChange={(species) => update({ species })}
        showAp={current.useAp}
        remaining={remaining}
      />
      <EntityPicker
        label="Kultur"
        category="kulturen"
        value={current.culture}
        onChange={(culture) => update({ culture })}
        showAp={current.useAp}
        remaining={remaining}
      />
      <EntityPicker
        label="Profession"
        category="professionen"
        value={current.profession}
        onChange={(profession) => update({ profession })}
        showAp={current.useAp}
        remaining={remaining}
      />

      <label className="field span-2">
        <span>Notizen</span>
        <textarea
          rows={5}
          value={current.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
