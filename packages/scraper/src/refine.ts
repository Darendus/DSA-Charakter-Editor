import { AttributeIds, type EntityBase } from "@dsa/schema";

/**
 * Ergänzt einen Roh-Eintrag um strukturiert geparste Werte, wo der Freitext
 * zuverlässig interpretierbar ist. Nicht Parsbares bleibt einfach roh in
 * `fields` stehen — das UI kann immer auf den Originaltext zurückfallen.
 */
export function refineEntity(entity: EntityBase): EntityBase & Record<string, unknown> {
  const result: EntityBase & Record<string, unknown> = { ...entity };
  const fields = entity.fields;

  const firstInt = (text: string | undefined): number | undefined => {
    if (!text) return undefined;
    const match = text.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : undefined;
  };

  const ap = firstInt(fields["AP-Wert"] ?? fields["AP-Wert des Bündels"] ?? fields["AP-Kosten"]);
  if (ap !== undefined) result.ap = ap;

  // Kulturen tragen ihre AP im Feld-Label: "Kulturpaket Xyz (55 AP)"
  if (result.ap === undefined) {
    const paketLabel = Object.keys(fields).find((label) => /^Kulturpaket/.test(label));
    const paketAp = paketLabel?.match(/\((\d+)\s*AP\)/);
    if (paketAp) result.ap = parseInt(paketAp[1]!, 10);
  }

  const check = fields["Probe"]?.match(/^([A-Z]{2})\/([A-Z]{2})\/([A-Z]{2})/);
  if (check) {
    const triple = [check[1], check[2], check[3]];
    if (triple.every((attr) => (AttributeIds as readonly string[]).includes(attr!))) {
      result.check = triple;
    }
  }

  const column = fields["Steigerungsfaktor"]?.match(/^\s*([A-E])\b/);
  if (column) result.improvementColumn = column[1];

  const lp = firstInt(fields["Lebensenergie-Grundwert"]);
  if (lp !== undefined) result.lpBase = lp;
  const spi = firstInt(fields["Seelenkraft-Grundwert"]);
  if (spi !== undefined) result.spiBase = spi;
  const tou = firstInt(fields["Zähigkeit-Grundwert"]);
  if (tou !== undefined) result.touBase = tou;
  const mov = firstInt(fields["Geschwindigkeit-Grundwert"]);
  if (mov !== undefined) result.movBase = mov;

  return result;
}
