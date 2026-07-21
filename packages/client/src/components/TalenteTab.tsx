import {
  fpBudget,
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

  // Homebrew: alle Talente starten bei -2 (Basiswert); im AP-Modus bei 0.
  const baseline = current.useAp ? 0 : -2;
  const minValue = baseline;
  // FP-Budget nur im Homebrew relevant (1 FP = 1 Talentpunkt über -2)
  const fp = fpBudget(current);

  const valueOf = (id: string) => current.talents.find((t) => t.id === id)?.value ?? baseline;

  const setValue = (talent: TalentEntry, value: number) => {
    const clamped = Math.max(minValue, Math.min(20, value));
    update((c) => {
      const rest = c.talents.filter((t) => t.id !== talent.id);
      // Nur Abweichungen vom Basiswert speichern
      return {
        ...c,
        talents:
          clamped !== baseline
            ? [...rest, { id: talent.id, name: talent.name, value: clamped }]
            : rest,
      };
    });
  };

  /** Darf um +1 gesteigert werden? Homebrew: nur solange FP übrig sind. */
  const canRaise = (value: number, column: ImprovementColumn) => {
    if (value >= 20) return false;
    if (current.useAp) return canAfford(current, budget, improvementCost(column, value + 1));
    return fp.remaining >= 1;
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
                      <button
                        onClick={() => setValue(talent, value - 1)}
                        disabled={value <= minValue}
                      >
                        −
                      </button>
                      <span className="value">{value}</span>
                      <button
                        onClick={() => setValue(talent, value + 1)}
                        disabled={!canRaise(value, column)}
                        title={
                          !canRaise(value, column)
                            ? current.useAp
                              ? "Nicht genug AP"
                              : "Keine FP übrig"
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
