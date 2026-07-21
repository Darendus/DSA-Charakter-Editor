import {
  COMBAT_TECHNIQUE_START,
  activationCost,
  apBreakdown,
  improvementCostRange,
  type ApBreakdown,
  type Character,
  type ImprovementColumn,
  type SkillValue,
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

  /** Spalte eigener Fertigkeiten aus dem Eintrag selbst, sonst aus den Regeldaten. */
  const columnFor = (own: SkillValue[], cats: string[], id: string): ImprovementColumn => {
    const custom = own.find((s) => s.id === id && s.custom);
    if (custom) return custom.improvementColumn ?? "A";
    return columnOf(cats.map((cat) => findEntry(cat, id)).find(Boolean) as never);
  };

  const castableCost =
    (own: SkillValue[], ...cats: string[]) =>
    (id: string, value: number): number => {
      const column = columnFor(own, cats, id);
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
    spellCost: castableCost([...character.spells, ...character.rituals], "zauber", "rituale"),
    liturgyCost: castableCost(
      [...character.liturgies, ...character.ceremonies],
      "liturgien",
      "zeremonien"
    ),
  });
}

/** true, wenn der Charakter sich `cost` weitere AP leisten kann (oder ohne AP spielt). */
export function canAfford(character: Character, budget: ApBreakdown, cost: number): boolean {
  return !character.useAp || budget.remaining >= cost;
}
