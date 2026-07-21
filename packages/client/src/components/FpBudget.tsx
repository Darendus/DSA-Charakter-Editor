import { fpBudget, type Character } from "@dsa/schema";

/** Laufende FP-Bilanz im Homebrew-Modus (1 FP = 1 Talentpunkt). */
export function FpBudget({ character }: { character: Character }) {
  const { total, spent, remaining } = fpBudget(character);
  return (
    <div className="ap-budget">
      <span className={remaining < 0 ? "ap-rest negative" : "ap-rest"}>
        {remaining} / {total} FP verfügbar
      </span>
      <span className="ap-parts muted">
        Anfang {character.fpInitial} · erhalten {character.fpEarned} · Talente {spent}
      </span>
    </div>
  );
}
