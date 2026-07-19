# DSA Charakter-Editor

Lokaler Charakter-Editor für **Das Schwarze Auge (DSA 5)**. Die Regeldaten werden aus dem
offiziellen [Ulisses Regelwiki](https://dsa.ulisses-regelwiki.de/) in lokale JSON-Dateien
gescrapt; darauf aufbauend bietet die App einen Editor zum Erstellen und Verwalten von Helden.

> **Hinweis:** Die Inhalte des Regelwikis sind © Ulisses Spiele. Die gescrapten Daten sind
> ausschließlich für den privaten Gebrauch bestimmt und werden nicht versioniert oder
> weitergegeben (`data/` steht in der `.gitignore`). Der Scraper arbeitet gedrosselt
> (sequenziell, Standard 400 ms Pause) und cached alle Seiten lokal.

## Aufbau (npm-Workspaces-Monorepo)

| Paket                 | Zweck                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| `packages/schema`     | Gemeinsame TypeScript-Typen, zod-Schemas, DSA-5-Formeln (SKT, LeP, …)  |
| `packages/scraper`    | CLI-Scraper: Crawling, HTML-Cache, Parser, JSON-Ausgabe                |
| `packages/server`     | Fastify-API: Regeldaten ausliefern, Charaktere als JSON-Dateien (CRUD) |
| `packages/client`     | React-Frontend (Vite): Charakterliste, Editor, Regeldaten-Browser      |
| `data/raw/`           | HTML-Cache des Scrapers (nicht versioniert)                            |
| `data/json/`          | Gescrapte Regeldaten: eine JSON-Datei je Kategorie + `index.json`      |
| `characters/`         | Gespeicherte Charaktere, eine JSON-Datei je Held                       |

## Benutzung

```bash
npm install

# 1. Regeldaten scrapen (einmalig, dauert wegen Drosselung eine Weile)
npm run scrape

#    Teilmengen / Tests:
npm run scrape -- --category zauber --limit 10
npm run scrape -- --category "spezies,kulturen"
npm run scrape -- --force            # Cache ignorieren, alles neu laden

# 2. App starten (Server auf :5174, Client auf :5173)
npm run dev
```

Danach im Browser: **http://localhost:5173**

> PowerShell verschluckt das `--`-Trennzeichen von npm. Dort stattdessen direkt aufrufen:
> `npx tsx packages/scraper/src/cli.ts --category zauber --limit 10`

## Scraper-Funktionsweise

1. **Discovery:** Ab konfigurierten Wurzelseiten (`packages/scraper/src/config.ts`) wird die
   Unternavigation (`nav.mod_navigation`) rekursiv verfolgt; Auswahlseiten
   (`zauberauswahl.html` …) verlinken ihre Einträge per Query-Parameter
   (`zauber.html?zauber=Ablativum`).
2. **Fetch & Cache:** Jede Seite landet als JSON (URL + Zeitstempel + HTML) unter `data/raw/`.
   Wiederholte Läufe parsen aus dem Cache; `--force` lädt neu.
3. **Parse:** Drei Seitenlayouts werden erkannt — Contao-Artikel mit
   `<strong>Label:</strong>`-Absätzen, eingebettete Grid-Detailseiten (`div.spalte1`) und
   Tabellen-Seiten (Rüstkammer). Alle Label→Wert-Paare bleiben **roh** in `fields` erhalten;
   zusätzlich werden zuverlässig parsbare Werte strukturiert ergänzt (`ap`, `check`,
   `improvementColumn`, Spezies-Grundwerte, …).
4. **Validierung & Ausgabe:** zod-validiert nach `data/json/<kategorie>.json`; Fehler landen
   in `data/json/errors.json`, das Manifest in `data/json/index.json`.

## Stand des Backbones

Umgesetzt: Charakterliste (anlegen/löschen), Editor mit AP-Bilanz, Grunddaten
(Spezies/Kultur/Profession aus den Regeldaten), Eigenschaften-Editor mit abgeleiteten Werten
(LeP, SK, ZK, AW, INI, GS nach DSA 5), Talente mit Steigerungskosten, Regeldaten-Browser über
alle Kategorien.

Vorbereitet, aber noch nicht ausgebaut: Kampf, Magie, Götterwirken, Besitz (Reiter vorhanden,
Datenmodell und Regeldaten liegen bereit). Ebenfalls offen: Voraussetzungs-Prüfungen,
PDF-Export, Optolith-Import.
