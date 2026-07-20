import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCharacterStore, useDataStore } from "../store";
import { ApBudget } from "../components/ApBudget";
import { BesitzTab } from "../components/BesitzTab";
import { EigenschaftenTab } from "../components/EigenschaftenTab";
import { GoetterwirkenTab } from "../components/GoetterwirkenTab";
import { GrunddatenTab } from "../components/GrunddatenTab";
import { KampfTab } from "../components/KampfTab";
import { MagieTab } from "../components/MagieTab";
import { TalenteTab } from "../components/TalenteTab";

const TABS = [
  { key: "grunddaten", label: "Grunddaten" },
  { key: "eigenschaften", label: "Eigenschaften" },
  { key: "talente", label: "Talente" },
  { key: "kampf", label: "Kampf" },
  { key: "magie", label: "Magie" },
  { key: "goetterwirken", label: "Götterwirken" },
  { key: "besitz", label: "Besitz" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CharacterEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { current, dirty, saving, error, open, save, close } = useCharacterStore();
  const loadCategory = useDataStore((s) => s.loadCategory);
  const [tab, setTab] = useState<TabKey>("grunddaten");
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    if (!id) return;
    open(id).catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
    return close;
  }, [id, open, close]);

  // Alle kostenrelevanten Kategorien vorladen, damit die AP-Bilanz sofort
  // stimmt (sonst würden Zauber/Kampftechniken/Liturgien bis zum Öffnen des
  // jeweiligen Tabs mit der billigsten Spalte A veranschlagt).
  useEffect(() => {
    const costCategories = [
      "spezies",
      "kulturen",
      "professionen",
      "talente",
      "kampftechniken",
      "zauber",
      "rituale",
      "liturgien",
      "zeremonien",
    ];
    for (const key of costCategories) {
      loadCategory(key).catch(() => {
        /* Daten fehlen - Hinweis kommt aus den Tabs */
      });
    }
  }, [loadCategory]);

  if (loadError) {
    return (
      <div className="page">
        <p className="error">Charakter konnte nicht geladen werden: {loadError}</p>
        <button onClick={() => navigate("/")}>Zurück zur Liste</button>
      </div>
    );
  }
  if (!current) return <p className="muted page">Lade Charakter …</p>;

  return (
    <div className="page editor">
      <div className="editor-head">
        <div>
          <h1>{current.name}</h1>
          <span className="muted">
            {current.species?.name ?? "Spezies offen"} · {current.profession?.name ?? "Profession offen"}
          </span>
        </div>
        <div className="editor-actions">
          {error && <span className="error">{error}</span>}
          <button className="primary" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Speichere …" : dirty ? "Speichern" : "Gespeichert"}
          </button>
        </div>
      </div>

      {current.useAp && <ApBudget character={current} />}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab active" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {tab === "grunddaten" && <GrunddatenTab />}
        {tab === "eigenschaften" && <EigenschaftenTab />}
        {tab === "talente" && <TalenteTab />}
        {tab === "kampf" && <KampfTab />}
        {tab === "magie" && <MagieTab />}
        {tab === "goetterwirken" && <GoetterwirkenTab />}
        {tab === "besitz" && <BesitzTab />}
      </div>
    </div>
  );
}
