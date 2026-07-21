import { useEffect } from "react";
import {
  COMBAT_TECHNIQUE_START,
  attackValue,
  improvementCost,
  improvementCostRange,
  parryValue,
  rangedValue,
  type AttributeId,
  type EntityBase,
  type ImprovementColumn,
} from "@dsa/schema";
import { customId } from "../customId";
import { useCharacterStore, useDataStore } from "../store";
import { canAfford, useApBudget } from "../useApBudget";
import { EntitySearchPicker } from "./EntitySearchPicker";
import { ManualEntryForm } from "./ManualEntryForm";

type TechniqueEntry = EntityBase & {
  improvementColumn?: ImprovementColumn;
  primaryAttributes?: AttributeId[];
};

const MAX_KTW = 25;

/** "-1/-1" bzw. "0/–" aus dem Waffenfeld "AT/PA-Mod" */
function parseAtPaMod(raw: string | undefined): [number, number] {
  const match = raw?.match(/(-?\d+)\s*\/\s*(-?\d+)/);
  return match ? [parseInt(match[1]!, 10), parseInt(match[2]!, 10)] : [0, 0];
}

export function KampfTab() {
  const { current, update } = useCharacterStore();
  const loadCategory = useDataStore((s) => s.loadCategory);
  const techniques = useDataStore((s) => s.categories["kampftechniken"]?.entries) as
    | TechniqueEntry[]
    | undefined;
  const findEntry = useDataStore((s) => s.findEntry);
  const budget = useApBudget(current);

  // Stat-Werte einer Waffe/Rüstung: bei eigenen Einträgen aus dem Eintrag,
  // sonst aus den Rüstkammer-Regeldaten.
  const statsOf = (item: { custom?: boolean; id: string; fields?: Record<string, string> }) =>
    item.custom ? (item.fields ?? {}) : (findEntry("ruestkammer", item.id)?.fields ?? {});

  useEffect(() => {
    for (const key of ["kampftechniken", "ruestkammer"]) {
      loadCategory(key).catch(() => {
        /* Hinweis kommt aus dem UI */
      });
    }
  }, [loadCategory]);

  if (!current) return null;
  if (!techniques) {
    return (
      <p className="muted">
        Keine Kampftechnik-Daten. Aktualisiere die Regeldaten im Reiter „Regeldaten".
      </p>
    );
  }

  const ktwOf = (id: string) =>
    current.combatTechniques.find((t) => t.id === id)?.value ?? COMBAT_TECHNIQUE_START;

  const isRanged = (technique: TechniqueEntry | undefined) =>
    technique?.primaryAttributes?.length === 1 && technique.primaryAttributes[0] === "FF";

  const setKtw = (technique: TechniqueEntry, value: number) => {
    const clamped = Math.max(COMBAT_TECHNIQUE_START, Math.min(MAX_KTW, value));
    update((c) => {
      const rest = c.combatTechniques.filter((t) => t.id !== technique.id);
      return {
        ...c,
        combatTechniques:
          clamped > COMBAT_TECHNIQUE_START
            ? [...rest, { id: technique.id, name: technique.name, value: clamped }]
            : rest,
      };
    });
  };

  const combatValues = (technique: TechniqueEntry | undefined, ktw: number) => {
    if (!technique) return { at: undefined, pa: undefined };
    if (isRanged(technique)) {
      return { at: rangedValue(ktw, current.attributes.FF), pa: undefined };
    }
    const primaries = (technique.primaryAttributes ?? []).map((id) => current.attributes[id]);
    return {
      at: attackValue(ktw, current.attributes.MU),
      pa: parryValue(ktw, primaries),
    };
  };

  return (
    <div className="kampf">
      <section>
        <h2>Kampftechniken</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Kampftechnik</th>
              <th>Leiteig.</th>
              <th>Sf.</th>
              <th>KtW</th>
              <th>AT/FK</th>
              <th>PA</th>
              {current.useAp && <th>AP</th>}
            </tr>
          </thead>
          <tbody>
            {techniques.map((technique) => {
              const ktw = ktwOf(technique.id);
              const { at, pa } = combatValues(technique, ktw);
              const column = technique.improvementColumn ?? "C";
              return (
                <tr key={technique.id}>
                  <td>{technique.name}</td>
                  <td className="muted">{technique.primaryAttributes?.join("/") ?? "–"}</td>
                  <td className="muted">{column}</td>
                  <td className="stepper">
                    <button
                      onClick={() => setKtw(technique, ktw - 1)}
                      disabled={ktw <= COMBAT_TECHNIQUE_START}
                    >
                      −
                    </button>
                    <span className="value">{ktw}</span>
                    <button
                      onClick={() => setKtw(technique, ktw + 1)}
                      disabled={
                        ktw >= MAX_KTW ||
                        !canAfford(current, budget, improvementCost(column, ktw + 1))
                      }
                      title={
                        !canAfford(current, budget, improvementCost(column, ktw + 1))
                          ? "Nicht genug AP"
                          : undefined
                      }
                    >
                      +
                    </button>
                  </td>
                  <td>{at ?? "–"}</td>
                  <td>{pa ?? "–"}</td>
                  {current.useAp && (
                    <td>
                      {ktw > COMBAT_TECHNIQUE_START
                        ? `${improvementCostRange(column, COMBAT_TECHNIQUE_START, ktw)} AP`
                        : "–"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Waffen</h2>
        <EntitySearchPicker
          category="ruestkammer"
          placeholder="Waffe hinzufügen …"
          filter={(entry) => Boolean(entry.fields["TP"])}
          excludeIds={current.weapons.map((w) => w.id)}
          onPick={(entry) =>
            update((c) => ({ ...c, weapons: [...c.weapons, { id: entry.id, name: entry.name }] }))
          }
        />
        {!current.useAp && (
          <ManualEntryForm
            legend="Eigene Waffe anlegen"
            fields={[
              { key: "TP", label: "TP", placeholder: "TP (z. B. 1W6+4)" },
              { key: "RW", label: "RW", placeholder: "RW (z. B. kurz)" },
              { key: "AT/PA-Mod", label: "AT/PA", placeholder: "AT/PA-Mod (z. B. -1/-1)" },
            ]}
            addLabel="Waffe anlegen"
            onAdd={(name, fields) =>
              update((c) => ({
                ...c,
                weapons: [...c.weapons, { id: customId(), name, custom: true, fields }],
              }))
            }
          />
        )}
        {current.weapons.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Waffe</th>
                <th>Kampftechnik</th>
                <th>TP</th>
                <th>RW</th>
                <th>AT/FK</th>
                <th>PA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {current.weapons.map((weapon) => {
                const wf = statsOf(weapon);
                const technique = weapon.combatTechniqueId
                  ? (techniques.find((t) => t.id === weapon.combatTechniqueId) as
                      | TechniqueEntry
                      | undefined)
                  : undefined;
                const ktw = technique ? ktwOf(technique.id) : 0;
                const base = combatValues(technique, ktw);
                const [atMod, paMod] = parseAtPaMod(wf["AT/PA-Mod"]);
                return (
                  <tr key={weapon.id}>
                    <td>
                      {weapon.name}
                      {weapon.custom && <span className="muted small"> (eigen)</span>}
                    </td>
                    <td>
                      <select
                        value={weapon.combatTechniqueId ?? ""}
                        onChange={(e) =>
                          update((c) => ({
                            ...c,
                            weapons: c.weapons.map((w) =>
                              w.id === weapon.id
                                ? { ...w, combatTechniqueId: e.target.value || undefined }
                                : w
                            ),
                          }))
                        }
                      >
                        <option value="">– wählen –</option>
                        {techniques.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{wf["TP"] ?? "?"}</td>
                    <td className="muted">{wf["RW"] ?? wf["Reichweite"] ?? ""}</td>
                    <td>{base.at !== undefined ? base.at + atMod : "–"}</td>
                    <td>
                      {technique && !isRanged(technique) && base.pa !== undefined
                        ? base.pa + paMod
                        : "–"}
                    </td>
                    <td>
                      <button
                        className="danger"
                        onClick={() =>
                          update((c) => ({
                            ...c,
                            weapons: c.weapons.filter((w) => w.id !== weapon.id),
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
      </section>

      <section>
        <h2>Rüstung</h2>
        <EntitySearchPicker
          category="ruestkammer"
          placeholder="Rüstung hinzufügen …"
          filter={(entry) => Boolean(entry.fields["Rüstungsschutz"])}
          excludeIds={current.armor.map((a) => a.id)}
          onPick={(entry) =>
            update((c) => ({ ...c, armor: [...c.armor, { id: entry.id, name: entry.name }] }))
          }
        />
        {!current.useAp && (
          <ManualEntryForm
            legend="Eigene Rüstung anlegen"
            fields={[
              { key: "Rüstungsschutz", label: "RS", placeholder: "RS (z. B. 4)", numeric: true },
              { key: "Belastungsstufe", label: "BE", placeholder: "BE (z. B. 2)", numeric: true },
            ]}
            addLabel="Rüstung anlegen"
            onAdd={(name, fields) =>
              update((c) => ({
                ...c,
                armor: [...c.armor, { id: customId(), name, custom: true, fields }],
              }))
            }
          />
        )}
        {current.armor.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Rüstung</th>
                <th>RS</th>
                <th>BE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {current.armor.map((piece) => {
                const af = statsOf(piece);
                return (
                  <tr key={piece.id}>
                    <td>
                      {piece.name}
                      {piece.custom && <span className="muted small"> (eigen)</span>}
                    </td>
                    <td>{af["Rüstungsschutz"] ?? "?"}</td>
                    <td>{af["Belastungsstufe"] ?? "?"}</td>
                    <td>
                      <button
                        className="danger"
                        onClick={() =>
                          update((c) => ({ ...c, armor: c.armor.filter((a) => a.id !== piece.id) }))
                        }
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>
                  <strong>Summe</strong>
                </td>
                <td>
                  <strong>
                    {current.armor.reduce((sum, piece) => {
                      const rs = statsOf(piece)["Rüstungsschutz"];
                      return sum + (rs ? parseInt(rs, 10) || 0 : 0);
                    }, 0)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {current.armor.reduce((sum, piece) => {
                      const be = statsOf(piece)["Belastungsstufe"];
                      return sum + (be ? parseInt(be, 10) || 0 : 0);
                    }, 0)}
                  </strong>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
