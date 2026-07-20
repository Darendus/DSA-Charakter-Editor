import {
  improvementCost,
  improvementCostRange,
  type EntityBase,
  type ImprovementColumn,
} from "@dsa/schema";
import { useCharacterStore, useDataStore } from "../store";
import { canAfford, useApBudget } from "../useApBudget";

type TalentEntry = EntityBase & {
  check?: [string, string, string];
  improvementColumn?: ImprovementColumn;
};

export function TalenteTab() {
  const { current, update } = useCharacterStore();
  const talente = useDataStore((s) => s.categories["talente"]?.entries) as
    | TalentEntry[]
    | undefined;
  const budget = useApBudget(current);
  if (!current) return null;

  if (!talente) {
    return (
      <p className="muted">
        Keine Talentdaten gefunden. Führe zuerst <code>npm run scrape</code> aus.
      </p>
    );
  }

  const valueOf = (id: string) => current.talents.find((t) => t.id === id)?.value ?? 0;

  const setValue = (talent: TalentEntry, value: number) => {
    const clamped = Math.max(0, Math.min(20, value));
    update((c) => {
      const rest = c.talents.filter((t) => t.id !== talent.id);
      return {
        ...c,
        talents:
          clamped > 0 ? [...rest, { id: talent.id, name: talent.name, value: clamped }] : rest,
      };
    });
  };

  // Nach Talentkategorie gruppieren (Körper-, Gesellschafts-, Natur-, Wissens-, Handwerkstalente)
  const groups = new Map<string, TalentEntry[]>();
  for (const talent of talente) {
    const group = talent.fields["Talentkategorie"] ?? "Sonstige";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(talent);
  }

  return (
    <div className="talente">
      {[...groups.entries()].map(([group, entries]) => (
        <section key={group}>
          <h2>{group}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Talent</th>
                <th>Probe</th>
                <th>Sf.</th>
                <th>FW</th>
                {current.useAp && <th>AP</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((talent) => {
                const value = valueOf(talent.id);
                const column = talent.improvementColumn ?? "A";
                return (
                  <tr key={talent.id}>
                    <td>{talent.name}</td>
                    <td className="muted">{talent.check?.join("/") ?? talent.fields["Probe"] ?? ""}</td>
                    <td className="muted">{column}</td>
                    <td className="stepper">
                      <button onClick={() => setValue(talent, value - 1)} disabled={value <= 0}>
                        −
                      </button>
                      <span className="value">{value}</span>
                      <button
                        onClick={() => setValue(talent, value + 1)}
                        disabled={
                          value >= 20 ||
                          !canAfford(current, budget, improvementCost(column, value + 1))
                        }
                        title={
                          !canAfford(current, budget, improvementCost(column, value + 1))
                            ? "Nicht genug AP"
                            : undefined
                        }
                      >
                        +
                      </button>
                    </td>
                    {current.useAp && (
                      <td>{value > 0 ? `${improvementCostRange(column, 0, value)} AP` : "–"}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
