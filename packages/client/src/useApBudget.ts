import {
  COMBAT_TECHNIQUE_START,
  activationCost,
  apBreakdown,
  improvementCostRange,
  type ApBreakdown,
  type Character,
  type ImprovementColumn,
} from "@dsa/schema";
import { useDataStore } from "./store";

export function columnOf(entry: unknown): ImprovementColumn {
  const col = (entry as { improvementColumn?: unknown } | undefined)?.improvementColumn;
  return col === "A" || col === "B" || col === "C" || col === "D" || col === "E" ? col : "A";
}

const EMPTY_BREAKDOWN: ApBreakdown = {
  attributes: 0,
  species: 0,
  culture: 0,
  profession: 0,
  advantages: 0,
  disadvantages: 0,
  specialAbilities: 0,
  talents: 0,
  combatTechniques: 0,
  spells: 0,
  liturgies: 0,
  total: 0,
  remaining: 0,
};

/**
 * Laufende AP-Bilanz des Charakters über alle Bereiche.
 * Fertigkeitskosten kommen aus der Steigerungsspalte der jeweiligen
 * Regeldaten (Fallback: Spalte A); Zauber/Liturgien inkl. Aktivierung.
 */
export function useApBudget(character: Character | undefined): ApBreakdown {
  const findEntry = useDataStore((s) => s.findEntry);
  const categories = useDataStore((s) => s.categories);
  void categories; // Re-Render, sobald weitere Kategorien geladen sind

  if (!character) return EMPTY_BREAKDOWN;

  const apOf = (category: string, id?: string): number | undefined => {
    if (!id) return undefined;
    const entry = findEntry(category, id) as { ap?: number } | undefined;
    return entry?.ap;
  };

  const skillCost =
    (category: string) =>
    (id: string, value: number): number =>
      improvementCostRange(columnOf(findEntry(category, id) as never), 0, value);

  const castableCost =
    (...cats: string[]) =>
    (id: string, value: number): number => {
      const entry = cats.map((cat) => findEntry(cat, id)).find(Boolean);
      const column = columnOf(entry as never);
      return activationCost(column) + improvementCostRange(column, 0, value);
    };

  return apBreakdown(character, {
    species: apOf("spezies", character.species?.id),
    culture: apOf("kulturen", character.culture?.id),
    profession: apOf("professionen", character.profession?.id),
    talentCost: skillCost("talente"),
    combatTechniqueCost: (id, value) =>
      improvementCostRange(
        columnOf(findEntry("kampftechniken", id) as never),
        COMBAT_TECHNIQUE_START,
        value
      ),
    spellCost: castableCost("zauber", "rituale"),
    liturgyCost: castableCost("liturgien", "zeremonien"),
  });
}

/** true, wenn der Charakter sich `cost` weitere AP leisten kann (oder ohne AP spielt). */
export function canAfford(character: Character, budget: ApBreakdown, cost: number): boolean {
  return !character.useAp || budget.remaining >= cost;
}
