import { useState } from "react";
import type { EntityRef } from "@dsa/schema";
import { useCharacterStore } from "../store";
import { useApBudget } from "../useApBudget";
import { EntitySearchPicker } from "./EntitySearchPicker";

interface Props {
  title: string;
  category: string;
  values: EntityRef[];
  onChange: (next: EntityRef[]) => void;
  /** AP-Kosten je Eintrag (Zaubertricks/Segnungen: 1) */
  apEach?: number;
}

/** Einfache Kannst-du-oder-nicht-Liste (Zaubertricks, Segnungen). */
export function RefListEditor({ title, category, values, onChange, apEach = 1 }: Props) {
  const current = useCharacterStore((s) => s.current);
  const budget = useApBudget(current);
  const useAp = current?.useAp ?? true;
  const [addError, setAddError] = useState<string>();

  return (
    <section className="skill-list">
      <h2>
        {title}{" "}
        {useAp && <span className="muted small">({apEach} AP je Eintrag)</span>}
      </h2>
      <EntitySearchPicker
        category={category}
        excludeIds={values.map((v) => v.id)}
        onPick={(entry) => {
          if (useAp && budget.remaining < apEach) {
            setAddError(`Nicht genug AP (${apEach} AP nötig, ${budget.remaining} frei)`);
            return;
          }
          setAddError(undefined);
          onChange(
            [...values, { id: entry.id, name: entry.name }].sort((a, b) =>
              a.name.localeCompare(b.name, "de")
            )
          );
        }}
      />
      {addError && <p className="error small">{addError}</p>}
      {values.length > 0 && (
        <ul className="chip-list">
          {values.map((ref) => (
            <li key={ref.id} className="chip">
              {ref.name}
              <button className="danger" onClick={() => onChange(values.filter((v) => v.id !== ref.id))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
