import {
  ATTRIBUTE_START,
  AttributeIds,
  attributeApCost,
  derivedValues,
  HUMAN_BASE,
  improvementCost,
  type AttributeId,
  type SpeciesBaseValues,
} from "@dsa/schema";
import { useCharacterStore, useDataStore } from "../store";
import { canAfford, useApBudget } from "../useApBudget";

const ATTRIBUTE_NAMES: Record<AttributeId, string> = {
  MU: "Mut",
  KL: "Klugheit",
  IN: "Intuition",
  CH: "Charisma",
  FF: "Fingerfertigkeit",
  GE: "Gewandtheit",
  KO: "Konstitution",
  KK: "Körperkraft",
};

export function EigenschaftenTab() {
  const { current, update } = useCharacterStore();
  const findEntry = useDataStore((s) => s.findEntry);
  const budget = useApBudget(current);
  if (!current) return null;

  const speciesEntry = current.species
    ? (findEntry("spezies", current.species.id) as Partial<SpeciesBaseValues> | undefined)
    : undefined;
  const base: SpeciesBaseValues = {
    lpBase: speciesEntry?.lpBase ?? HUMAN_BASE.lpBase,
    spiBase: speciesEntry?.spiBase ?? HUMAN_BASE.spiBase,
    touBase: speciesEntry?.touBase ?? HUMAN_BASE.touBase,
    movBase: speciesEntry?.movBase ?? HUMAN_BASE.movBase,
  };

  const derived = derivedValues(current.attributes, base, {
    isSpellcaster: Boolean(current.magicTradition),
    magicPrimaryAttribute: current.magicTradition?.primaryAttribute,
    isBlessed: Boolean(current.karmalTradition),
    karmalPrimaryAttribute: current.karmalTradition?.primaryAttribute,
  });

  const setAttribute = (id: AttributeId, value: number) => {
    const clamped = Math.max(8, Math.min(19, value));
    update((c) => ({ ...c, attributes: { ...c.attributes, [id]: clamped } }));
  };

  return (
    <div className="eigenschaften">
      <table className="table">
        <thead>
          <tr>
            <th>Eigenschaft</th>
            <th>Wert</th>
            {current.useAp && <th>AP-Kosten</th>}
          </tr>
        </thead>
        <tbody>
          {AttributeIds.map((id) => {
            const value = current.attributes[id];
            return (
              <tr key={id}>
                <td>
                  <strong>{id}</strong> <span className="muted">{ATTRIBUTE_NAMES[id]}</span>
                </td>
                <td className="stepper">
                  <button onClick={() => setAttribute(id, value - 1)} disabled={value <= ATTRIBUTE_START}>
                    −
                  </button>
                  <span className="value">{value}</span>
                  <button
                    onClick={() => setAttribute(id, value + 1)}
                    disabled={
                      value >= 19 || !canAfford(current, budget, improvementCost("E", value + 1))
                    }
                    title={
                      !canAfford(current, budget, improvementCost("E", value + 1))
                        ? "Nicht genug AP"
                        : undefined
                    }
                  >
                    +
                  </button>
                </td>
                {current.useAp && <td>{attributeApCost(value)} AP</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="derived">
        <h2>Abgeleitete Werte</h2>
        <dl>
          <div>
            <dt>Lebensenergie (LeP)</dt>
            <dd>{derived.lp}</dd>
          </div>
          {derived.asp !== undefined && (
            <div>
              <dt>Astralenergie (AsP)</dt>
              <dd>{derived.asp}</dd>
            </div>
          )}
          {derived.kap !== undefined && (
            <div>
              <dt>Karmaenergie (KaP)</dt>
              <dd>{derived.kap}</dd>
            </div>
          )}
          <div>
            <dt>Seelenkraft (SK)</dt>
            <dd>{derived.spi}</dd>
          </div>
          <div>
            <dt>Zähigkeit (ZK)</dt>
            <dd>{derived.tou}</dd>
          </div>
          <div>
            <dt>Ausweichen (AW)</dt>
            <dd>{derived.dodge}</dd>
          </div>
          <div>
            <dt>Initiative (INI)</dt>
            <dd>{derived.ini}</dd>
          </div>
          <div>
            <dt>Geschwindigkeit (GS)</dt>
            <dd>{derived.mov}</dd>
          </div>
          <div>
            <dt>Schicksalspunkte</dt>
            <dd>{derived.fatePoints}</dd>
          </div>
        </dl>
        {!speciesEntry && (
          <p className="muted small">
            Basiswerte: Mensch (Standard) - wähle unter Grunddaten eine Spezies für korrekte Werte.
          </p>
        )}
      </div>
    </div>
  );
}
