import type { Attributes, Character } from "./character";
import type { AttributeId, ImprovementColumn } from "./entities";

/**
 * DSA-5-Steigerungskosten (Regelwerk, Steigerungskostentabelle).
 * Spalten A–D für Fertigkeiten/Kampftechniken/Zauber/Liturgien, E für Eigenschaften.
 */
const COLUMN_FACTOR: Record<ImprovementColumn, number> = { A: 1, B: 2, C: 3, D: 4, E: 15 };

/** Bis zu diesem Zielwert kostet jeder Punkt genau den Spaltenfaktor. */
const FLAT_THRESHOLD: Record<ImprovementColumn, number> = { A: 12, B: 12, C: 12, D: 12, E: 14 };

/** AP-Kosten, um von `target - 1` auf `target` zu steigern. */
export function improvementCost(column: ImprovementColumn, target: number): number {
  const factor = COLUMN_FACTOR[column];
  const threshold = FLAT_THRESHOLD[column];
  if (target <= threshold) return factor;
  return (target - threshold + 1) * factor;
}

/** Summierte AP-Kosten für die Steigerung von `from` auf `to`. */
export function improvementCostRange(column: ImprovementColumn, from: number, to: number): number {
  let sum = 0;
  for (let v = from + 1; v <= to; v++) sum += improvementCost(column, v);
  return sum;
}

/** Aktivierung eines Zaubers/einer Liturgie (Fertigkeitswert 0) kostet einmalig den Spaltenfaktor. */
export function activationCost(column: ImprovementColumn): number {
  return COLUMN_FACTOR[column];
}

/** Eigenschaften starten bei 8 und werden über Spalte E gesteigert. */
export const ATTRIBUTE_START = 8;

/** Kampftechniken starten beim Basiswert 6. */
export const COMBAT_TECHNIQUE_START = 6;

// ---------------------------------------------------------------------------
// Kampfwerte (DSA 5): Bonus = je 3 volle Punkte der Leiteigenschaft über 8
// ---------------------------------------------------------------------------

const attributeBonus = (value: number) => Math.max(0, Math.floor((value - 8) / 3));

/** Attacke (Nahkampf): KtW + Bonus aus MU */
export function attackValue(ktw: number, mu: number): number {
  return ktw + attributeBonus(mu);
}

/** Parade: ⌈KtW/2⌉ + Bonus aus der höchsten Leiteigenschaft der Kampftechnik */
export function parryValue(ktw: number, primaryAttributeValues: number[]): number {
  const best = primaryAttributeValues.length ? Math.max(...primaryAttributeValues) : 8;
  return Math.ceil(ktw / 2) + attributeBonus(best);
}

/** Fernkampf: KtW + Bonus aus FF */
export function rangedValue(ktw: number, ff: number): number {
  return ktw + attributeBonus(ff);
}

export function attributeApCost(value: number): number {
  return improvementCostRange("E", ATTRIBUTE_START, value);
}

export function totalAttributeApCost(attributes: Attributes): number {
  return (Object.values(attributes) as number[]).reduce((sum, v) => sum + attributeApCost(v), 0);
}

// ---------------------------------------------------------------------------
// Abgeleitete Werte (DSA 5, kaufmännisch gerundet)
// ---------------------------------------------------------------------------

const round = (n: number) => Math.round(n);

export interface SpeciesBaseValues {
  lpBase: number;
  spiBase: number;
  touBase: number;
  movBase: number;
}

/** Basiswerte für Menschen als Fallback, solange keine Spezies gewählt ist. */
export const HUMAN_BASE: SpeciesBaseValues = { lpBase: 5, spiBase: -5, touBase: -5, movBase: 8 };

export interface DerivedValues {
  /** Lebensenergie */
  lp: number;
  /** Astralenergie (undefined ohne magische Tradition) */
  asp?: number;
  /** Karmaenergie (undefined ohne karmale Tradition) */
  kap?: number;
  /** Seelenkraft */
  spi: number;
  /** Zähigkeit */
  tou: number;
  /** Ausweichen */
  dodge: number;
  /** Initiative */
  ini: number;
  /** Geschwindigkeit */
  mov: number;
  /** Schicksalspunkte */
  fatePoints: number;
}

export function derivedValues(
  attributes: Attributes,
  species: SpeciesBaseValues = HUMAN_BASE,
  options: {
    magicPrimaryAttribute?: AttributeId;
    karmalPrimaryAttribute?: AttributeId;
    isSpellcaster?: boolean;
    isBlessed?: boolean;
  } = {}
): DerivedValues {
  const { MU, KL, IN, CH: _CH, GE, KO, KK } = attributes;
  const primary = (id?: AttributeId) => (id ? attributes[id] : 0);

  return {
    lp: species.lpBase + 2 * KO,
    asp: options.isSpellcaster ? 20 + primary(options.magicPrimaryAttribute) : undefined,
    kap: options.isBlessed ? 20 + primary(options.karmalPrimaryAttribute) : undefined,
    spi: species.spiBase + round((MU + KL + IN) / 6),
    tou: species.touBase + round((KO + KO + KK) / 6),
    dodge: round(GE / 2),
    ini: round((MU + GE) / 2),
    mov: species.movBase,
    fatePoints: 3,
  };
}

// ---------------------------------------------------------------------------
// AP-Buchhaltung
// ---------------------------------------------------------------------------

export interface ApBreakdown {
  attributes: number;
  species: number;
  culture: number;
  profession: number;
  advantages: number;
  disadvantages: number; // negativ (bringen AP zurück)
  specialAbilities: number;
  talents: number;
  combatTechniques: number;
  spells: number;
  liturgies: number;
  total: number;
  remaining: number;
}

/**
 * Zählt die ausgegebenen AP eines Charakters zusammen.
 * Fertigkeiten werden ohne Kenntnis der SKT-Spalte konservativ nicht bewertet -
 * dafür sind die `apCost`-Angaben an den Einträgen bzw. `costs`-Callbacks gedacht.
 */
export function apBreakdown(
  character: Character,
  costs: {
    species?: number;
    culture?: number;
    profession?: number;
    talentCost?: (id: string, value: number) => number;
    combatTechniqueCost?: (id: string, value: number) => number;
    spellCost?: (id: string, value: number) => number;
    liturgyCost?: (id: string, value: number) => number;
  } = {}
): ApBreakdown {
  const sumOwned = (list: { apCost?: number }[]) =>
    list.reduce((s, a) => s + (a.apCost ?? 0), 0);
  const sumSkills = (
    list: { id: string; value: number }[],
    fn?: (id: string, value: number) => number
  ) => list.reduce((s, t) => s + (fn ? fn(t.id, t.value) : 0), 0);

  const breakdown = {
    attributes: totalAttributeApCost(character.attributes),
    species: costs.species ?? 0,
    culture: costs.culture ?? 0,
    profession: costs.profession ?? 0,
    advantages: sumOwned(character.advantages),
    disadvantages: -sumOwned(character.disadvantages),
    specialAbilities: sumOwned(character.specialAbilities),
    talents: sumSkills(character.talents, costs.talentCost),
    combatTechniques: sumSkills(character.combatTechniques, costs.combatTechniqueCost),
    // Zaubertricks und Segnungen kosten pauschal 1 AP je Eintrag
    spells:
      sumSkills(character.spells, costs.spellCost) +
      sumSkills(character.rituals, costs.spellCost) +
      character.cantrips.length,
    liturgies:
      sumSkills(character.liturgies, costs.liturgyCost) +
      sumSkills(character.ceremonies, costs.liturgyCost) +
      character.blessings.length,
  };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { ...breakdown, total, remaining: character.apTotal - total };
}
