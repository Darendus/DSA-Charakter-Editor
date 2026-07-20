import { ATTRIBUTE_LABELS, AttributeIds, attributeIdFromName, type AttributeId } from "@dsa/schema";
import { useDataStore } from "../store";
import { EntitySearchPicker } from "./EntitySearchPicker";

interface Tradition {
  name: string;
  primaryAttribute?: AttributeId;
}

interface Props {
  label: string;
  /** Kategorie mit Traditions-Einträgen (Feld "Leiteigenschaft") */
  category: string;
  tradition?: Tradition;
  onChange: (tradition?: Tradition) => void;
  energyLabel: string;
  energyValue?: number;
}

/** Traditionswahl + Leiteigenschaft + Energieanzeige (AsP bzw. KaP). */
export function TraditionSection({
  label,
  category,
  tradition,
  onChange,
  energyLabel,
  energyValue,
}: Props) {
  const categories = useDataStore((s) => s.categories);
  void categories;

  return (
    <section className="tradition">
      <h2>{label}</h2>
      {tradition ? (
        <div className="tradition-current">
          <strong>{tradition.name}</strong>
          <label>
            Leiteigenschaft{" "}
            <select
              value={tradition.primaryAttribute ?? ""}
              onChange={(e) =>
                onChange({
                  ...tradition,
                  primaryAttribute: (e.target.value || undefined) as AttributeId | undefined,
                })
              }
            >
              <option value="">–</option>
              {AttributeIds.map((id) => (
                <option key={id} value={id}>
                  {id} ({ATTRIBUTE_LABELS[id]})
                </option>
              ))}
            </select>
          </label>
          <span className="energy">
            {energyLabel}: <strong>{energyValue ?? "–"}</strong>
          </span>
          <button className="danger" onClick={() => onChange(undefined)}>
            Tradition entfernen
          </button>
        </div>
      ) : (
        <EntitySearchPicker
          category={category}
          placeholder="Tradition wählen …"
          filter={(entry) => Boolean(entry.fields["Leiteigenschaft"])}
          onPick={(entry) =>
            onChange({
              name: entry.name,
              primaryAttribute: attributeIdFromName(entry.fields["Leiteigenschaft"] ?? ""),
            })
          }
        />
      )}
    </section>
  );
}
