import type { Character } from "@dsa/schema";
import { useApBudget } from "../useApBudget";

/** Laufende AP-Bilanz über alle bisher gepflegten Bereiche. */
export function ApBudget({ character }: { character: Character }) {
  const breakdown = useApBudget(character);

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
          .map(([label, value]) => `${label} ${value}`)
          .join(" · ") || "noch keine AP ausgegeben"}
      </span>
    </div>
  );
}
