import type { EntityBase } from "@dsa/schema";
import { useCharacterStore, useDataStore } from "../store";

interface PickerProps {
  label: string;
  category: string;
  value?: { id: string; name: string };
  onChange: (ref?: { id: string; name: string }) => void;
}

function EntityPicker({ label, category, value, onChange }: PickerProps) {
  const entries = useDataStore((s) => s.categories[category]?.entries);

  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value?.id ?? ""}
        onChange={(e) => {
          const entry = entries?.find((entity: EntityBase) => entity.id === e.target.value);
          onChange(entry ? { id: entry.id, name: entry.name } : undefined);
        }}
      >
        <option value="">– nicht gewählt –</option>
        {(entries ?? []).map((entry: EntityBase & { ap?: number }) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
            {entry.ap !== undefined ? ` (${entry.ap} AP)` : ""}
          </option>
        ))}
      </select>
      {!entries && <span className="muted small">Keine Daten — `npm run scrape` ausführen?</span>}
    </label>
  );
}

export function GrunddatenTab() {
  const { current, update } = useCharacterStore();
  if (!current) return null;

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
        <span>AP gesamt</span>
        <input
          type="number"
          min={0}
          step={5}
          value={current.apTotal}
          onChange={(e) => update({ apTotal: Number(e.target.value) || 0 })}
        />
      </label>

      <EntityPicker
        label="Spezies"
        category="spezies"
        value={current.species}
        onChange={(species) => update({ species })}
      />
      <EntityPicker
        label="Kultur"
        category="kulturen"
        value={current.culture}
        onChange={(culture) => update({ culture })}
      />
      <EntityPicker
        label="Profession"
        category="professionen"
        value={current.profession}
        onChange={(profession) => update({ profession })}
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
