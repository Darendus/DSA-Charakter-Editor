import { useState } from "react";
import {
  activationCost,
  improvementCost,
  improvementCostRange,
  type EntityBase,
  type SkillValue,
} from "@dsa/schema";
import { useCharacterStore, useDataStore } from "../store";
import { columnOf, useApBudget } from "../useApBudget";
import { EntitySearchPicker } from "./EntitySearchPicker";

interface Props {
  title: string;
  /** Kategorie für Picker, Probe-Anzeige und Steigerungsspalte */
  category: string;
  values: SkillValue[];
  onChange: (next: SkillValue[]) => void;
  /** Aktivierungskosten (Zauber/Liturgien) in die AP-Anzeige einrechnen */
  includeActivation?: boolean;
  maxValue?: number;
}

/**
 * Liste erlernter Fertigkeiten (Zauber, Rituale, Liturgien, Zeremonien):
 * per Suche hinzufügen, FW steigern, AP-Kosten live.
 */
export function SkillListEditor({
  title,
  category,
  values,
  onChange,
  includeActivation = false,
  maxValue = 20,
}: Props) {
  const findEntry = useDataStore((s) => s.findEntry);
  const categories = useDataStore((s) => s.categories);
  void categories; // Re-Render nach Kategorie-Laden
  const current = useCharacterStore((s) => s.current);
  const budget = useApBudget(current);
  const useAp = current?.useAp ?? true;
  const [addError, setAddError] = useState<string>();

  const affordable = (cost: number) => !useAp || budget.remaining >= cost;

  const setValue = (id: string, name: string, value: number) => {
    const clamped = Math.max(0, Math.min(maxValue, value));
    onChange([...values.filter((v) => v.id !== id), { id, name, value: clamped }].sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    ));
  };

  const apOf = (skill: SkillValue) => {
    const column = columnOf(findEntry(category, skill.id));
    return (
      improvementCostRange(column, 0, skill.value) + (includeActivation ? activationCost(column) : 0)
    );
  };

  return (
    <section className="skill-list">
      <h2>{title}</h2>
      <EntitySearchPicker
        category={category}
        excludeIds={values.map((v) => v.id)}
        onPick={(entry) => {
          const cost = includeActivation
            ? activationCost(columnOf(entry as { improvementColumn?: unknown }))
            : 0;
          if (!affordable(cost)) {
            setAddError(`Nicht genug AP für die Aktivierung von „${entry.name}" (${cost} AP)`);
            return;
          }
          setAddError(undefined);
          setValue(entry.id, entry.name, 0);
        }}
      />
      {addError && <p className="error small">{addError}</p>}
      {values.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Probe</th>
              <th>Sf.</th>
              <th>FW</th>
              {useAp && <th>AP</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {values.map((skill) => {
              const entry = findEntry(category, skill.id);
              const check =
                (entry as { check?: string[] } | undefined)?.check?.join("/") ??
                entry?.fields["Probe"] ??
                "";
              return (
                <tr key={skill.id}>
                  <td>{skill.name}</td>
                  <td className="muted">{check}</td>
                  <td className="muted">{columnOf(entry)}</td>
                  <td className="stepper">
                    <button
                      onClick={() => setValue(skill.id, skill.name, skill.value - 1)}
                      disabled={skill.value <= 0}
                    >
                      −
                    </button>
                    <span className="value">{skill.value}</span>
                    <button
                      onClick={() => setValue(skill.id, skill.name, skill.value + 1)}
                      disabled={
                        skill.value >= maxValue ||
                        !affordable(improvementCost(columnOf(entry), skill.value + 1))
                      }
                      title={
                        !affordable(improvementCost(columnOf(entry), skill.value + 1))
                          ? "Nicht genug AP"
                          : undefined
                      }
                    >
                      +
                    </button>
                  </td>
                  {useAp && <td>{apOf(skill)} AP</td>}
                  <td>
                    <button
                      className="danger"
                      onClick={() => onChange(values.filter((v) => v.id !== skill.id))}
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
  );
}
