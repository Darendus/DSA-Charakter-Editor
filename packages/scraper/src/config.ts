export interface CategoryConfig {
  /** Kategorie-Schlüssel = Name der Ausgabedatei data/json/<key>.json */
  key: string;
  /** Start-URLs relativ zur Wiki-Basis */
  roots: string[];
  /** Unternavigation (nav.mod_navigation) rekursiv verfolgen? */
  crawlNav: boolean;
  /** URLs, die nicht besucht werden (z. B. weil eine andere Kategorie sie abdeckt) */
  exclude?: RegExp[];
  maxDepth?: number;
}

/** Seiten, die nie besucht werden: Impressum & Co. und der ab-18-Bereich. */
export const GLOBAL_EXCLUDE: RegExp[] = [
  /WdV18\.html/i,
  /wege-der-vereinigungen/i,
  /kontakt\.html/i,
  /impressum\.html/i,
  /datenschutz/i,
  /index\.html$/i,
  // Suchergebnisse und gefilterte Auswahl-Ansichten (?merkmal=, ?publikation= …)
  // sind nur Duplikate der ungefilterten Listen.
  /suche\.html/i,
  /auswahl[^/?]*\.html\?/i,
];

/**
 * Detailseiten-Endpunkte, die genau einer Kategorie gehören. Andere Kategorien
 * folgen solchen Links nicht — Professionsseiten verlinken z. B. ihre typischen
 * Zauber, die sonst als Professions-Einträge landen würden.
 */
export const QUERY_ENDPOINT_OWNER: Record<string, string> = {
  "vorteil.html": "vorteile",
  "nachteil.html": "nachteile",
  "talent.html": "talente",
  "kampftechnik.html": "kampftechniken",
  "zauber.html": "zauber",
  "ritual.html": "rituale",
  "zaubertrick.html": "zaubertricks",
  "liturgie.html": "liturgien",
  "zeremonie.html": "zeremonien",
  "segen.html": "segen",
  "talisman_karmal.html": "talismane",
  // Spezial-Zauberarten und magische Traditionen gehören zur Magie-Sektion
  "zaubermelodie.html": "magie",
  "zaubertanz.html": "magie",
  "zauberrune.html": "magie",
  "hexenfluch.html": "magie",
  "animistenkraft.html": "magie",
  "elfenlied.html": "magie",
  "herrschaftsritual.html": "magie",
  "schelmenstreich.html": "magie",
  "zibiljaritual.html": "magie",
  "magische_tradition.html": "magie",
  "traditionsartefakt.html": "magie",
  "karmale_tradition.html": "goetterwirken",
  // SF-Detail-Endpunkte gehören zur Sonderfertigkeiten-Sektion
  "allgemeine_karmale_sonderfertigkeit.html": "sonderfertigkeiten",
  "allgemeine_magische_sonderfertigkeit.html": "sonderfertigkeiten",
  "erw_zauber_sf.html": "sonderfertigkeiten",
  "zauberstil_sf.html": "sonderfertigkeiten",
  "liturgiestilsonderfertigkeit.html": "sonderfertigkeiten",
  "erweiterte_liturgiestilsonderfertigkeit.html": "sonderfertigkeiten",
  "zeremonialgegenstands_sf.html": "sonderfertigkeiten",
};

/** Liefert die Besitzer-Kategorie eines Query-Endpunkts (Dateiname klein). */
export function queryEndpointOwner(endpoint: string): string | undefined {
  if (endpoint.startsWith("traditionsartefakt_sf_")) return "sonderfertigkeiten";
  return QUERY_ENDPOINT_OWNER[endpoint];
}

const AUSWAHL_MAGIE = [
  /zauberauswahl/i,
  /ritualauswahl/i,
  /zaubertrickauswahl/i,
  /zauber\.html\?/i,
  /ritual\.html\?/i,
  /zaubertrick\.html\?/i,
];

const AUSWAHL_GOETTER = [
  /liturgieauswahl/i,
  /zeremonieauswahl/i,
  /segenauswahl/i,
  /talisman_karmal_auswahl/i,
  /liturgie\.html\?/i,
  /zeremonie\.html\?/i,
  /segen\.html\?/i,
  /talisman\.html\?/i,
];

const AUSWAHL_FERTIGKEITEN = [
  /talentauswahl/i,
  /kampftechnikauswahl/i,
  /talent\.html\?/i,
  /kampftechnik\.html\?/i,
];

/**
 * Kategorien des Regelwikis.
 * Auswahlseiten (crawlNav: false) verlinken ihre Einträge per Query-Parameter;
 * Sektions-Crawls folgen der Unternavigation bis zu den Detailseiten.
 */
export const CATEGORIES: CategoryConfig[] = [
  { key: "spezies", roots: ["spezies.html"], crawlNav: true },
  { key: "kulturen", roots: ["kulturen.html"], crawlNav: true },
  { key: "professionen", roots: ["professionen.html"], crawlNav: true },
  { key: "vorteile", roots: ["vorteilauswahl.html"], crawlNav: false },
  { key: "nachteile", roots: ["nachteilauswahl.html"], crawlNav: false },
  { key: "sonderfertigkeiten", roots: ["sonderfertigkeiten.html"], crawlNav: true },
  { key: "talente", roots: ["talentauswahl.html"], crawlNav: false },
  { key: "kampftechniken", roots: ["kampftechnikauswahl.html"], crawlNav: false },
  { key: "zauber", roots: ["zauberauswahl.html"], crawlNav: false },
  { key: "rituale", roots: ["ritualauswahl.html"], crawlNav: false },
  { key: "zaubertricks", roots: ["zaubertrickauswahl.html"], crawlNav: false },
  { key: "magie", roots: ["magie.html"], crawlNav: true, exclude: AUSWAHL_MAGIE },
  { key: "liturgien", roots: ["liturgieauswahl.html"], crawlNav: false },
  { key: "zeremonien", roots: ["zeremonieauswahl.html"], crawlNav: false },
  { key: "segen", roots: ["segenauswahl.html"], crawlNav: false },
  { key: "talismane", roots: ["talisman_karmal_auswahl.html"], crawlNav: false },
  {
    key: "goetterwirken",
    // Die Regel-Unterseiten sind auf goetterwirken.html nur im Fließtext
    // verlinkt (nicht in der Unternavigation) und brauchen eigene Wurzeln.
    roots: [
      "goetterwirken.html",
      "KdG_Götterwirken.html",
      "GR_Segen-Regeln.html",
      "RE_Aufbau-Liturgie-Zeremoniebeschreibung.html",
      "RE_Begabungen-durch-Liturgien.html",
    ],
    crawlNav: true,
    exclude: AUSWAHL_GOETTER,
  },
  { key: "ruestkammer", roots: ["ruestkammer.html"], crawlNav: true },
  { key: "bestiarium", roots: ["bestiarium.html"], crawlNav: true },
  { key: "herbarium", roots: ["herbarium.html"], crawlNav: true },
  { key: "gifte-krankheiten", roots: ["GifteundKrankheiten.html"], crawlNav: true },
  { key: "regeln", roots: ["regeln.html"], crawlNav: true, exclude: AUSWAHL_FERTIGKEITEN },
];
