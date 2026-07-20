import { useEffect } from "react";
import { useCharacterStore, useDataStore } from "../store";
import { RefListEditor } from "./RefListEditor";
import { SkillListEditor } from "./SkillListEditor";
import { TraditionSection } from "./TraditionSection";

export function GoetterwirkenTab() {
  const { current, update } = useCharacterStore();
  const loadCategory = useDataStore((s) => s.loadCategory);

  useEffect(() => {
    for (const key of ["goetterwirken", "liturgien", "zeremonien", "segen"]) {
      loadCategory(key).catch(() => {
        /* Hinweis kommt aus den Pickern */
      });
    }
  }, [loadCategory]);

  if (!current) return null;

  const kap = current.karmalTradition?.primaryAttribute
    ? 20 + current.attributes[current.karmalTradition.primaryAttribute]
    : current.karmalTradition
      ? 20
      : undefined;

  return (
    <div>
      <TraditionSection
        label="Karmale Tradition"
        category="goetterwirken"
        tradition={current.karmalTradition}
        onChange={(karmalTradition) => update({ karmalTradition })}
        energyLabel="KaP"
        energyValue={kap}
      />
      {!current.karmalTradition && (
        <p className="muted small">
          Ohne Tradition keine Karmaenergie - Liturgien lassen sich trotzdem schon erfassen.
        </p>
      )}

      <SkillListEditor
        title="Liturgien"
        category="liturgien"
        values={current.liturgies}
        onChange={(liturgies) => update({ liturgies })}
        includeActivation
      />
      <SkillListEditor
        title="Zeremonien"
        category="zeremonien"
        values={current.ceremonies}
        onChange={(ceremonies) => update({ ceremonies })}
        includeActivation
      />
      <RefListEditor
        title="Segnungen"
        category="segen"
        values={current.blessings}
        onChange={(blessings) => update({ blessings })}
      />
    </div>
  );
}
