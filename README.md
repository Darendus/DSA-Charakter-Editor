# DSA Charakter-Editor

Lokaler Charakter-Editor für **Das Schwarze Auge (DSA 5)**. Die Regeldaten werden aus dem
offiziellen [Ulisses Regelwiki](https://dsa.ulisses-regelwiki.de/) in lokale JSON-Dateien
gescrapt; darauf aufbauend bietet die App einen Editor zum Erstellen und Verwalten von Helden.

> **Hinweis:** Die Inhalte des Regelwikis sind © Ulisses Spiele. Die gescrapten Daten sind
> ausschließlich für den privaten Gebrauch bestimmt und werden nicht versioniert oder
> weitergegeben (`data/` steht in der `.gitignore`). Der Scraper arbeitet gedrosselt
> (sequenziell, Standard 400 ms Pause) und cached alle Seiten lokal.

## Aufbau (npm-Workspaces-Monorepo)

| Paket                 | Zweck                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| `packages/schema`     | Gemeinsame TypeScript-Typen, zod-Schemas, DSA-5-Formeln (SKT, LeP, AT/PA, …) |
| `packages/scraper`    | Scraper als CLI **und** Bibliothek (`runScrape`): Crawling, Cache, Parser |
| `packages/server`     | Fastify-API: Regeldaten, Charakter-CRUD, Scraper-Steuerung (`buildServer` einbettbar) |
| `packages/client`     | React-Frontend (Vite, dunkles Theme): Editor mit allen Tabs, Datenbrowser |
| `packages/desktop`    | Electron-Hülle + electron-builder → portable `DSA-Charakter-Editor.exe` |
| `data/raw/`           | HTML-Cache des Scrapers (nicht versioniert)                             |
| `data/json/`          | Gescrapte Regeldaten: eine JSON-Datei je Kategorie + `index.json`       |
| `characters/`         | Gespeicherte Charaktere, eine JSON-Datei je Held                        |

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

# oder als Desktop-App (Electron, nutzt die Repo-Daten)
npm run desktop

# portable Windows-.exe bauen -> packages/desktop/release/DSA-Charakter-Editor.exe
npm run dist
```

Danach im Browser: **http://localhost:5173**

Die .exe ist vollständig eigenständig: Sie startet den eingebetteten Server, legt ihre Daten
unter `%APPDATA%\dsa-charakter-editor` ab und kann die Regeldaten über den Reiter
„Regeldaten" → „Regeldaten aktualisieren" selbst scrapen.

> PowerShell verschluckt das `--`-Trennzeichen von npm. Dort stattdessen direkt aufrufen:
> `npx tsx packages/scraper/src/cli.ts --category zauber --limit 10`

## Scraper-Funktionsweise

1. **Discovery:** Ab konfigurierten Wurzelseiten (`packages/scraper/src/config.ts`) wird die
   Unternavigation (`nav.mod_navigation`) rekursiv verfolgt; Auswahlseiten
   (`zauberauswahl.html` …) verlinken ihre Einträge per Query-Parameter
   (`zauber.html?zauber=Ablativum`).
2. **Fetch & Cache:** Jede Seite landet als JSON (URL + Zeitstempel + HTML) unter `data/raw/`.
   Wiederholte Läufe parsen aus dem Cache; `--force` lädt neu.
3. **Parse:** Drei Seitenlayouts werden erkannt - Contao-Artikel mit
   `<strong>Label:</strong>`-Absätzen, eingebettete Grid-Detailseiten (`div.spalte1`) und
   Tabellen-Seiten (Rüstkammer). Alle Label→Wert-Paare bleiben **roh** in `fields` erhalten;
   zusätzlich werden zuverlässig parsbare Werte strukturiert ergänzt (`ap`, `check`,
   `improvementColumn`, Spezies-Grundwerte, …).
4. **Validierung & Ausgabe:** zod-validiert nach `data/json/<kategorie>.json`; Fehler landen
   in `data/json/errors.json`, das Manifest in `data/json/index.json`.

## Stand (Iteration 2)

Umgesetzt: Charakterliste, Editor mit AP-Bilanz und dunklem Theme; Tabs **Grunddaten**
(Spezies/Kultur/Profession), **Eigenschaften** (abgeleitete Werte nach DSA 5), **Talente**,
**Kampf** (Kampftechniken mit AT/PA/FK, Waffen inkl. AT/PA-Mod, Rüstung mit RS/BE-Summe),
**Magie** (Tradition + AsP, Zauber/Rituale mit Aktivierungs- und Steigerungskosten,
Zaubertricks), **Götterwirken** (Tradition + KaP, Liturgien/Zeremonien/Segnungen),
**Besitz** (Rüstkammer-Picker, eigene Gegenstände, Gewichtssumme, Geld). Der Scraper ist aus
der App startbar (Fortschritts-Log, Abbruch), und `npm run dist` erzeugt eine portable .exe.
Beim Anlegen eines Charakters (und nachträglich unter Grunddaten) lässt sich **„Ohne AP
(Homebrew)"** wählen - dann werden AP-Budget und sämtliche Kostenanzeigen ausgeblendet.
Im AP-Modus ist das Budget verbindlich: Steigerungen und Käufe, die das Maximum übersteigen,
sind gesperrt. Das Maximum wächst über das Feld **„AP hinzufügen"** unter Grunddaten
(z. B. Abenteuer-Belohnungen; negative Beträge zur Korrektur sind erlaubt, nie unter die
bereits ausgegebenen AP).

Offen für spätere Iterationen: Voraussetzungs-Prüfungen, PDF-Export, Optolith-Import,
App-Icon/Signierung der .exe.
