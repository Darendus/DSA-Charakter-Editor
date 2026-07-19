import { apBreakdown, improvementCostRange, type Character, type ImprovementColumn } from "@dsa/schema";
import { useDataStore } from "../store";

function columnOf(entry: { improvementColumn?: unknown } | undefined): ImprovementColumn {
  const col = entry?.improvementColumn;
  return col === "A" || col === "B" || col === "C" || col === "D" || col === "E" ? col : "A";
}

/**
 * Laufende AP-Bilanz über alle bisher gepflegten Bereiche.
 * Kosten für Fertigkeiten werden über die Steigerungsspalte der
 * jeweiligen Regeldaten berechnet (Fallback: Spalte A).
 */
export function ApBudget({ character }: { character: Character }) {
  const findEntry = useDataStore((s) => s.findEntry);
  const categories = useDataStore((s) => s.categories);
  void categories; // Re-Render, sobald weitere Kategorien geladen sind

  const apOf = (category: string, id?: string): number | undefined => {
    if (!id) return undefined;
    const entry = findEntry(category, id) as { ap?: number } | undefined;
    return entry?.ap;
  };

  const skillCost =
    (category: string) =>
    (id: string, value: number): number =>
      improvementCostRange(columnOf(findEntry(category, id) as never), 0, value);

  const breakdown = apBreakdown(character, {
    species: apOf("spezies", character.species?.id),
    culture: apOf("kulturen", character.culture?.id),
    profession: apOf("professionen", character.profession?.id),
    talentCost: skillCost("talente"),
    combatTechniqueCost: (id, value) =>
      improvementCostRange(columnOf(findEntry("kampftechniken", id) as never), 6, value),
    spellCost: skillCost("zauber"),
    liturgyCost: skillCost("liturgien"),
  });

  const parts: [string, number][] = [
    ["Eigenschaften", breakdown.attributes],
    ["Spezies", breakdown.species],
    ["Kultur", breakdown.culture],
    ["Profession", breakdown.profession],
    ["Vorteile", breakdown.advantages],
    ["Nachteile", breakdown.disadvantages],
    ["SF", breakdown.specialAbilities],
    ["Talente", breakdown.talents],
    ["Kampf", breakdown.combatTechniques],
    ["Zauber", breakdown.spells],
    ["Liturgien", breakdown.liturgies],
  ];

  return (
    <div className="ap-budget">
      <span className={breakdown.remaining < 0 ? "ap-rest negative" : "ap-rest"}>
        {breakdown.remaining} / {character.apTotal} AP frei
      </span>
      <span className="ap-parts muted">
        {parts
          .filter(([, value]) => value !== 0)
          .map(([label, value]) => `${label} ${value > 0 ? value : value}`)
          .join(" · ") || "noch keine AP ausgegeben"}
      </span>
    </div>
  );
}
