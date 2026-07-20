import { useEffect } from "react";
import { useCharacterStore, useDataStore } from "../store";
import { RefListEditor } from "./RefListEditor";
import { SkillListEditor } from "./SkillListEditor";
import { TraditionSection } from "./TraditionSection";

export function MagieTab() {
  const { current, update } = useCharacterStore();
  const loadCategory = useDataStore((s) => s.loadCategory);

  useEffect(() => {
    for (const key of ["magie", "zauber", "rituale", "zaubertricks"]) {
      loadCategory(key).catch(() => {
        /* Hinweis kommt aus den Pickern */
      });
    }
  }, [loadCategory]);

  if (!current) return null;

  const asp = current.magicTradition?.primaryAttribute
    ? 20 + current.attributes[current.magicTradition.primaryAttribute]
    : current.magicTradition
      ? 20
      : undefined;

  return (
    <div>
      <TraditionSection
        label="Magische Tradition"
        category="magie"
        tradition={current.magicTradition}
        onChange={(magicTradition) => update({ magicTradition })}
        energyLabel="AsP"
        energyValue={asp}
      />
      {!current.magicTradition && (
        <p className="muted small">
          Ohne Tradition keine Astralenergie - Zauber lassen sich trotzdem schon erfassen.
        </p>
      )}

      <SkillListEditor
        title="Zaubersprüche"
        category="zauber"
        values={current.spells}
        onChange={(spells) => update({ spells })}
        includeActivation
      />
      <SkillListEditor
        title="Rituale"
        category="rituale"
        values={current.rituals}
        onChange={(rituals) => update({ rituals })}
        includeActivation
      />
      <RefListEditor
        title="Zaubertricks"
        category="zaubertricks"
        values={current.cantrips}
        onChange={(cantrips) => update({ cantrips })}
      />
    </div>
  );
}
