import { z } from "zod";

/**
 * Alle gescrapten Einträge folgen dem "Raw-first"-Prinzip:
 * `fields` enthält immer die unveränderten Label→Text-Paare der Wiki-Seite.
 * Zusätzlich geparste, strukturierte Werte sind optional und können fehlen,
 * wenn der Freitext nicht sauber zu interpretieren war.
 */
/** Mehrzeilige Wiki-Tabelle (z. B. Sprachenliste, Ausbildungsaufsätze) */
export const EntityTableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
export type EntityTable = z.infer<typeof EntityTableSchema>;

export const EntityBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  url: z.string().url(),
  /** Label → Rohtext, exakt wie im Wiki (z. B. "AP-Wert" → "18 Abenteuerpunkte") */
  fields: z.record(z.string(), z.string()),
  /** Fließtext-Absätze ohne Label (Beschreibungen, Regeltext) */
  description: z.string().optional(),
  /** Mehrzeilige Tabellen, strukturiert (einzeilige Tabellen landen in `fields`) */
  tables: z.array(EntityTableSchema).optional(),
  /** Publikationsangaben ("Regelwerk Seite 104" o. ä.) */
  publications: z.array(z.string()).optional(),
  scrapedAt: z.string(),
});
export type EntityBase = z.infer<typeof EntityBaseSchema>;

export const AttributeIds = ["MU", "KL", "IN", "CH", "FF", "GE", "KO", "KK"] as const;
export const AttributeIdSchema = z.enum(AttributeIds);
export type AttributeId = z.infer<typeof AttributeIdSchema>;

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  MU: "Mut",
  KL: "Klugheit",
  IN: "Intuition",
  CH: "Charisma",
  FF: "Fingerfertigkeit",
  GE: "Gewandtheit",
  KO: "Konstitution",
  KK: "Körperkraft",
};

/** "Klugheit"/"KL" → "KL"; kennt auch die Wiki-Schreibvariante "Gewandheit". */
export function attributeIdFromName(name: string): AttributeId | undefined {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if ((AttributeIds as readonly string[]).includes(upper)) return upper as AttributeId;
  const lower = trimmed.toLowerCase();
  if (lower === "gewandheit") return "GE";
  return (Object.entries(ATTRIBUTE_LABELS) as [AttributeId, string][]).find(
    ([, label]) => label.toLowerCase() === lower
  )?.[0];
}

export const ImprovementColumnSchema = z.enum(["A", "B", "C", "D", "E"]);
export type ImprovementColumn = z.infer<typeof ImprovementColumnSchema>;

/** Geparste Probe, z. B. "MU/KL/CH" → ["MU","KL","CH"] */
export const CheckSchema = z.tuple([AttributeIdSchema, AttributeIdSchema, AttributeIdSchema]);
export type Check = z.infer<typeof CheckSchema>;

// ---------------------------------------------------------------------------
// Kategorien mit zusätzlichen geparsten Feldern
// ---------------------------------------------------------------------------

export const SpeciesSchema = EntityBaseSchema.extend({
  category: z.literal("spezies"),
  ap: z.number().int().optional(),
  lpBase: z.number().int().optional(),
  spiBase: z.number().int().optional(),
  touBase: z.number().int().optional(),
  movBase: z.number().int().optional(),
});
export type Species = z.infer<typeof SpeciesSchema>;

export const CultureSchema = EntityBaseSchema.extend({
  category: z.literal("kulturen"),
  ap: z.number().int().optional(),
});
export type Culture = z.infer<typeof CultureSchema>;

export const ProfessionSchema = EntityBaseSchema.extend({
  category: z.literal("professionen"),
  ap: z.number().int().optional(),
});
export type Profession = z.infer<typeof ProfessionSchema>;

export const AdvantageSchema = EntityBaseSchema.extend({
  category: z.literal("vorteile"),
  ap: z.number().int().optional(),
});
export type Advantage = z.infer<typeof AdvantageSchema>;

export const DisadvantageSchema = EntityBaseSchema.extend({
  category: z.literal("nachteile"),
  ap: z.number().int().optional(),
});
export type Disadvantage = z.infer<typeof DisadvantageSchema>;

export const SpecialAbilitySchema = EntityBaseSchema.extend({
  category: z.literal("sonderfertigkeiten"),
  ap: z.number().int().optional(),
});
export type SpecialAbility = z.infer<typeof SpecialAbilitySchema>;

export const TalentSchema = EntityBaseSchema.extend({
  category: z.literal("talente"),
  check: CheckSchema.optional(),
  improvementColumn: ImprovementColumnSchema.optional(),
});
export type Talent = z.infer<typeof TalentSchema>;

export const CombatTechniqueSchema = EntityBaseSchema.extend({
  category: z.literal("kampftechniken"),
  improvementColumn: ImprovementColumnSchema.optional(),
});
export type CombatTechnique = z.infer<typeof CombatTechniqueSchema>;

/** Zauber, Rituale, Liturgien und Zeremonien teilen dieselbe Feldstruktur. */
export const CastableSchema = EntityBaseSchema.extend({
  category: z.enum(["zauber", "rituale", "liturgien", "zeremonien"]),
  check: CheckSchema.optional(),
  improvementColumn: ImprovementColumnSchema.optional(),
});
export type Castable = z.infer<typeof CastableSchema>;

export const GenericEntitySchema = EntityBaseSchema;
export type GenericEntity = z.infer<typeof GenericEntitySchema>;

/** Datei-Format einer Kategorie-JSON: data/json/<kategorie>.json */
export const CategoryFileSchema = z.object({
  category: z.string(),
  source: z.string().url(),
  scrapedAt: z.string(),
  count: z.number().int(),
  entries: z.array(EntityBaseSchema),
});
export type CategoryFile = z.infer<typeof CategoryFileSchema>;

/** Manifest data/json/index.json */
export const DataManifestSchema = z.object({
  scrapedAt: z.string(),
  source: z.string().url(),
  categories: z.array(
    z.object({
      category: z.string(),
      file: z.string(),
      count: z.number().int(),
      errors: z.number().int(),
    })
  ),
});
export type DataManifest = z.infer<typeof DataManifestSchema>;
