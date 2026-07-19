export const BASE_URL = "https://dsa.ulisses-regelwiki.de/";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalisiert Wiki-Text: geschützte Leerzeichen, typografische Halbgeviertstriche
 * (das Wiki schreibt "–4" statt "-4"), mehrfache Leerzeichen.
 */
export function cleanText(text: string): string {
  return text
    .replace(/[\u00a0\ufeff]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Löst einen (ggf. relativen) Link gegen die Basis auf und normalisiert ihn. */
export function resolveUrl(href: string, base: string = BASE_URL): string | undefined {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function isSameHost(url: string): boolean {
  try {
    return new URL(url).host === new URL(BASE_URL).host;
  } catch {
    return false;
  }
}
