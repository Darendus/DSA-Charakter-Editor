import { useState } from "react";
import {
  activationCost,
  improvementCost,
  improvementCostRange,
  type ImprovementColumn,
  type SkillValue,
} from "@dsa/schema";
import { customId } from "../customId";
import { useCharacterStore, useDataStore } from "../store";
import { columnOf, useApBudget } from "../useApBudget";
import { EntitySearchPicker } from "./EntitySearchPicker";
import { ManualEntryForm } from "./ManualEntryForm";

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

  /** Steigerungsspalte: bei eigenen Einträgen aus dem Eintrag selbst, sonst aus den Regeldaten. */
  const columnFor = (skill: SkillValue): ImprovementColumn =>
    skill.custom ? (skill.improvementColumn ?? "A") : columnOf(findEntry(category, skill.id));

  const checkFor = (skill: SkillValue): string => {
    if (skill.custom) return skill.check ?? "";
    const entry = findEntry(category, skill.id);
    return (
      (entry as { check?: string[] } | undefined)?.check?.join("/") ?? entry?.fields["Probe"] ?? ""
    );
  };

  /** FW ändern, ohne die Zusatzfelder eigener Einträge zu verlieren. */
  const setValue = (skill: SkillValue, value: number) => {
    const clamped = Math.max(0, Math.min(maxValue, value));
    onChange(
      [...values.filter((v) => v.id !== skill.id), { ...skill, value: clamped }].sort((a, b) =>
        a.name.localeCompare(b.name, "de")
      )
    );
  };

  const addCustom = (name: string, fields: Record<string, string>) => {
    onChange(
      [
        ...values,
        {
          id: customId(),
          name,
          value: 0,
          custom: true,
          check: fields["Probe"],
          improvementColumn: (fields["Steigerungsfaktor"] as ImprovementColumn) || undefined,
        },
      ].sort((a, b) => a.name.localeCompare(b.name, "de"))
    );
  };

  const apOf = (skill: SkillValue) => {
    const column = columnFor(skill);
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
          setValue({ id: entry.id, name: entry.name, value: 0 }, 0);
        }}
      />
      {!useAp && (
        <ManualEntryForm
          legend={`Eigene(n) ${title} anlegen`}
          fields={[
            { key: "Probe", label: "Probe", placeholder: "z. B. MU/KL/CH" },
            { key: "Steigerungsfaktor", label: "Sf.", options: ["A", "B", "C", "D"] },
          ]}
          onAdd={addCustom}
        />
      )}
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
              const column = columnFor(skill);
              return (
                <tr key={skill.id}>
                  <td>
                    {skill.name}
                    {skill.custom && <span className="muted small"> (eigen)</span>}
                  </td>
                  <td className="muted">{checkFor(skill)}</td>
                  <td className="muted">{column}</td>
                  <td className="stepper">
                    <button onClick={() => setValue(skill, skill.value - 1)} disabled={skill.value <= 0}>
                      −
                    </button>
                    <span className="value">{skill.value}</span>
                    <button
                      onClick={() => setValue(skill, skill.value + 1)}
                      disabled={
                        skill.value >= maxValue ||
                        !affordable(improvementCost(column, skill.value + 1))
                      }
                      title={
                        !affordable(improvementCost(column, skill.value + 1))
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
