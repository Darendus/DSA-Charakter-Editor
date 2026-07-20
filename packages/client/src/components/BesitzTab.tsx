import { useEffect, useState } from "react";
import { useCharacterStore, useDataStore } from "../store";
import { EntitySearchPicker } from "./EntitySearchPicker";

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
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    loadCategory("ruestkammer").catch(() => {
      /* Picker zeigt den Zustand an */
    });
  }, [loadCategory]);

  if (!current) return null;

  const setCount = (index: number, count: number) => {
    update((c) => ({
      ...c,
      equipment: c.equipment.map((item, i) =>
        i === index ? { ...item, count: Math.max(1, count) } : item
      ),
    }));
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    update((c) => ({ ...c, equipment: [...c.equipment, { name, count: 1 }] }));
    setCustomName("");
  };

  const totalWeight = current.equipment.reduce((sum, item) => {
    if (!item.id) return sum;
    const weight = parseWeight(findEntry("ruestkammer", item.id)?.fields["Gewicht"]);
    return sum + (weight ?? 0) * item.count;
  }, 0);

  return (
    <div className="besitz">
      <section>
        <h2>Ausrüstung</h2>
        <div className="besitz-add">
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
          <div className="custom-add">
            <input
              placeholder="Eigener Gegenstand …"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
            <button onClick={addCustom}>Hinzufügen</button>
          </div>
        </div>

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
                const entry = item.id ? findEntry("ruestkammer", item.id) : undefined;
                return (
                  <tr key={`${item.id ?? item.name}-${index}`}>
                    <td>{item.name}</td>
                    <td className="stepper">
                      <button onClick={() => setCount(index, item.count - 1)} disabled={item.count <= 1}>
                        −
                      </button>
                      <span className="value">{item.count}</span>
                      <button onClick={() => setCount(index, item.count + 1)}>+</button>
                    </td>
                    <td className="muted">{entry?.fields["Gewicht"] ?? ""}</td>
                    <td className="muted">{entry?.fields["Preis"] ?? ""}</td>
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
