import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { BASE_URL, cleanText, isSameHost, resolveUrl } from "./util";

/**
 * Das Regelwiki liefert zwei Seitenlayouts:
 *
 * 1. "static"  - normale Contao-Artikel: `#main .ce_text` mit `<h1>` und
 *    Feldern als `<p><strong>Label: </strong>Wert</p>`.
 * 2. "grid"    - die per Query-Parameter adressierten Detailseiten
 *    (zauber.html?zauber=…, vorteil.html?vorteil=… usw.). Dort steckt ein
 *    komplettes eingebettetes HTML-Dokument im Artikel; die Felder sind
 *    `<div class="spalte1">Label</div><div>Wert</div>`-Paare, Abschnitte
 *    werden mit `<div class="body_einzeln">Titel</div>` eingeleitet.
 *
 * Unterseiten-Navigation (Crawl-Frontier) steht in `nav.mod_navigation`,
 * Auswahlseiten verlinken Einträge als `<a href='detail.html?param=Name'>`.
 */
export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export interface ParsedPage {
  kind: "static" | "grid" | "empty";
  title?: string;
  fields: Record<string, string>;
  description?: string;
  /** Mehrzeilige Tabellen (einzeilige werden zu `fields`) */
  tables: ParsedTable[];
  publications: string[];
  /** Kind-Seiten aus der Unternavigation (absolute URLs) */
  navLinks: string[];
  /** Detail-Links mit Query-Parameter (Auswahlseiten), absolute URLs */
  queryLinks: string[];
}

const QUERY_LINK = /\.html\?[\w-]+=/;

export function parsePage(html: string, pageUrl: string): ParsedPage {
  const $ = cheerio.load(html);

  // Eingebettete Dokumente bringen eigenes <style>/<title> mit - deren
  // Inhalt darf nicht als Beschreibungstext im Eintrag landen.
  $("script, style, noscript, link, meta, title").remove();

  // Contao schreibt wurzel-relative Links ohne führenden Slash
  // ("ruestkammer/ausruestungspakete/x.html" auch auf Unterseiten) - deshalb
  // wird immer gegen die Site-Wurzel aufgelöst, nie gegen die aktuelle Seite.
  void pageUrl;

  const navLinks: string[] = [];
  $("nav.mod_navigation a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (href.includes("#") || href.startsWith("mailto:")) return;
    const url = resolveUrl(href, BASE_URL);
    if (url && isSameHost(url)) navLinks.push(url);
  });

  const queryLinks: string[] = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (!QUERY_LINK.test(href)) return;
    const url = resolveUrl(href, BASE_URL);
    if (url && isSameHost(url) && !queryLinks.includes(url)) queryLinks.push(url);
  });

  // Grid-Layout? (eingebettetes Dokument mit Label-Spalten)
  if ($("div.spalte1").length > 0 && $("div.header").length > 0) {
    return { ...parseGrid($), navLinks, queryLinks, kind: "grid" };
  }
  return { ...parseStatic($), navLinks, queryLinks };
}

/** Text eines Elements; <br> wird zu Zeilenumbruch, <p>-Absätze durch Leerzeile getrennt. */
function textOf($: CheerioAPI, el: Cheerio<AnyNode>): string {
  const clone = el.clone();
  clone.find("br").replaceWith("\n");
  const paragraphs = clone.find("p");
  if (paragraphs.length > 0) {
    return cleanText(
      paragraphs
        .toArray()
        .map((p) => cleanText($(p).text()))
        .filter(Boolean)
        .join("\n\n")
    );
  }
  return cleanText(clone.text());
}

function parsePublications(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseStatic($: CheerioAPI): Omit<ParsedPage, "navLinks" | "queryLinks"> {
  // Manche Detailseiten haben kein <h1> - dann trägt der Breadcrumb den Seitennamen.
  const title =
    cleanText($("#main h1").first().text()) ||
    cleanText($(".mod_breadcrumb li.active").first().text()) ||
    undefined;
  const fields: Record<string, string> = {};
  const publications: string[] = [];
  const descriptionParts: string[] = [];

  const addField = (label: string, value: string) => {
    if (!value) return;
    if (/^Publikation/i.test(label)) {
      publications.push(...parsePublications(value));
    } else {
      fields[label] = fields[label] ? `${fields[label]}\n${value}` : value;
    }
  };

  // Rüstkammer-Seiten: Werte stehen in einer Tabelle (th = Label, eine Datenzeile);
  // mehrzeilige Tabellen (Übersichten) bleiben strukturiert erhalten.
  const tables: ParsedTable[] = [];
  $("#main table").each((_, tbl) => {
    const headers = $(tbl)
      .find("thead th")
      .toArray()
      .map((th) => cleanText($(th).text()));
    const rows = $(tbl).find("tbody tr").toArray();
    if (!headers.length || !rows.length) return;
    if (rows.length === 1) {
      const cells = $(rows[0]!)
        .find("td")
        .toArray()
        .map((td) => cleanText($(td).text()));
      headers.forEach((header, idx) => {
        if (header && cells[idx]) addField(header, cells[idx]!);
      });
    } else {
      tables.push({
        headers,
        rows: rows.map((row) =>
          $(row)
            .find("td")
            .toArray()
            .map((td) => cleanText($(td).text()))
        ),
      });
    }
  });

  // Reihenfolge der Absätze ist relevant: ein Absatz, der nur aus einem
  // <strong>-Label besteht ("Regeltechnik:"), bezieht sich auf die folgenden Absätze.
  let pendingLabel: string | undefined;
  $("#main .ce_text p").each((_, p) => {
    const $p = $(p);
    const text = textOf($, $p);
    if (!text) return;

    const strong = $p.children("strong").first();
    const strongText = strong.length ? cleanText(strong.text()) : "";

    if (strongText && text.startsWith(strongText)) {
      const label = strongText.replace(/:\s*$/, "");
      const value = cleanText(text.slice(strongText.length)).replace(/^:\s*/, "");
      if (!value) {
        pendingLabel = label;
        return;
      }
      pendingLabel = undefined;
      addField(label, value);
      return;
    }

    if (pendingLabel) {
      addField(pendingLabel, text);
      return;
    }

    if (/^Publikation(en)?:?\s/i.test(text)) {
      publications.push(...parsePublications(text.replace(/^Publikation(en)?:?\s*/i, "")));
      return;
    }
    descriptionParts.push(text);
  });

  const description = descriptionParts.join("\n\n") || undefined;
  const isEmpty =
    !title || (Object.keys(fields).length === 0 && !description && tables.length === 0);
  return {
    kind: isEmpty ? "empty" : "static",
    title,
    fields,
    description,
    tables,
    publications,
  };
}

function parseGrid($: CheerioAPI): Omit<ParsedPage, "navLinks" | "queryLinks" | "kind"> {
  const title = cleanText($("div.header").first().text()) || undefined;
  const fields: Record<string, string> = {};
  const publications: string[] = [];

  const addField = (label: string, value: string) => {
    if (!value) return;
    if (/^Publikation/i.test(label)) {
      publications.push(...parsePublications(value));
    } else {
      fields[label] = fields[label] ? `${fields[label]}\n${value}` : value;
    }
  };

  const children = $("div.body").first().children().toArray();
  let i = 0;
  let section: string | undefined;
  while (i < children.length) {
    const $el = $(children[i]!);
    if ($el.hasClass("spalte1")) {
      const label = cleanText($el.text()).replace(/:\s*$/, "");
      let value = "";
      let j = i + 1;
      while (j < children.length) {
        const $v = $(children[j]!);
        if ($v.hasClass("spalte1") || $v.hasClass("body_einzeln") || $v.hasClass("line_separator"))
          break;
        const text = textOf($, $v);
        if (text) value = value ? `${value}\n${text}` : text;
        j++;
      }
      addField(label, value);
      section = undefined;
      i = j;
    } else if ($el.hasClass("body_einzeln")) {
      section = cleanText($el.text());
      i++;
    } else if ($el.hasClass("line_separator")) {
      section = undefined;
      i++;
    } else {
      if (section) {
        const text = textOf($, $el);
        if (text) fields[section] = fields[section] ? `${fields[section]}\n${text}` : text;
      }
      i++;
    }
  }

  return { title, fields, publications, description: undefined, tables: [] };
}
