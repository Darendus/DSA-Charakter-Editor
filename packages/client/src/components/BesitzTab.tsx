import { useEffect } from "react";
import type { EquipmentEntry } from "@dsa/schema";
import { customId } from "../customId";
import { useCharacterStore, useDataStore } from "../store";
import { EntitySearchPicker } from "./EntitySearchPicker";
import { ManualEntryForm } from "./ManualEntryForm";

/** "0,5 Stn" / "1 Stein" / "10 Stein" → Gewicht in Stein; sonst undefined */
function parseWeight(raw: string | undefined): number | undefined {
  const match = raw?.match(/^([\d.,]+)\s*(Stn|Stein)/i);
  if (!match) return undefined;
  const value = parseFloat(match[1]!.replace(".", "").replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

const MONEY_FIELDS = [
  ["dukaten", "Dukaten"],
  ["silbertaler", "Silbertaler"],
  ["heller", "Heller"],
  ["kreuzer", "Kreuzer"],
] as const;

export function BesitzTab() {
  const { current, update } = useCharacterStore();
  const loadCategory = useDataStore((s) => s.loadCategory);
  const findEntry = useDataStore((s) => s.findEntry);

  useEffect(() => {
    loadCategory("ruestkammer").catch(() => {
      /* Picker zeigt den Zustand an */
    });
  }, [loadCategory]);

  if (!current) return null;

  /** Stat-Felder eines Gegenstands: eigene aus dem Eintrag, sonst aus den Regeldaten. */
  const statsOf = (item: EquipmentEntry): Record<string, string> =>
    item.custom ? (item.fields ?? {}) : item.id ? (findEntry("ruestkammer", item.id)?.fields ?? {}) : {};

  const setCount = (index: number, count: number) => {
    update((c) => ({
      ...c,
      equipment: c.equipment.map((item, i) =>
        i === index ? { ...item, count: Math.max(1, count) } : item
      ),
    }));
  };

  const addItem = (name: string, fields: Record<string, string>) => {
    const hasFields = Object.keys(fields).length > 0;
    update((c) => ({
      ...c,
      equipment: [
        ...c.equipment,
        hasFields
          ? { id: customId(), name, count: 1, custom: true, fields }
          : { name, count: 1 },
      ],
    }));
  };

  const totalWeight = current.equipment.reduce((sum, item) => {
    const weight = parseWeight(statsOf(item)["Gewicht"]);
    return sum + (weight ?? 0) * item.count;
  }, 0);

  return (
    <div className="besitz">
      <section>
        <h2>Ausrüstung</h2>
        <EntitySearchPicker
          category="ruestkammer"
          placeholder="Gegenstand aus der Rüstkammer …"
          onPick={(entry) =>
            update((c) => ({
              ...c,
              equipment: [...c.equipment, { id: entry.id, name: entry.name, count: 1 }],
            }))
          }
        />
        <ManualEntryForm
          legend="Eigener Gegenstand"
          fields={
            current.useAp
              ? []
              : [
                  { key: "Gewicht", label: "Gewicht", placeholder: "Gewicht (z. B. 1 Stein)" },
                  { key: "Preis", label: "Preis", placeholder: "Preis (z. B. 10 S)" },
                ]
          }
          onAdd={addItem}
        />

        {current.equipment.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Gegenstand</th>
                <th>Anzahl</th>
                <th>Gewicht</th>
                <th>Preis</th>
                <th>Notiz</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {current.equipment.map((item, index) => {
                const f = statsOf(item);
                return (
                  <tr key={`${item.id ?? item.name}-${index}`}>
                    <td>
                      {item.name}
                      {item.custom && <span className="muted small"> (eigen)</span>}
                    </td>
                    <td className="stepper">
                      <button onClick={() => setCount(index, item.count - 1)} disabled={item.count <= 1}>
                        −
                      </button>
                      <span className="value">{item.count}</span>
                      <button onClick={() => setCount(index, item.count + 1)}>+</button>
                    </td>
                    <td className="muted">{f["Gewicht"] ?? ""}</td>
                    <td className="muted">{f["Preis"] ?? ""}</td>
                    <td>
                      <input
                        value={item.notes ?? ""}
                        placeholder="–"
                        onChange={(e) =>
                          update((c) => ({
                            ...c,
                            equipment: c.equipment.map((it, i) =>
                              i === index ? { ...it, notes: e.target.value || undefined } : it
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="danger"
                        onClick={() =>
                          update((c) => ({
                            ...c,
                            equipment: c.equipment.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="muted small">
          Gesamtgewicht (soweit bekannt): <strong>{totalWeight.toLocaleString("de-DE")} Stein</strong>
        </p>
      </section>

      <section>
        <h2>Geld</h2>
        <div className="money-grid">
          {MONEY_FIELDS.map(([key, label]) => (
            <label key={key} className="field">
              <span>{label}</span>
              <input
                type="number"
                min={0}
                value={current.money[key]}
                onChange={(e) =>
                  update((c) => ({
                    ...c,
                    money: { ...c.money, [key]: Math.max(0, Number(e.target.value) || 0) },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
