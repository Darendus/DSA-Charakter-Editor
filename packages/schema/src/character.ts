import { z } from "zod";
import { AttributeIdSchema, ImprovementColumnSchema } from "./entities";

/** Freie Stat-Felder für manuell angelegte Einträge (gleiche Form wie EntityBase.fields) */
export const CustomFieldsSchema = z.record(z.string(), z.string());

/** Referenz auf einen gescrapten Eintrag (per id), Name redundant für Anzeige ohne Datenlookup. */
export const EntityRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Manuell angelegt (Homebrew) — keine Regeldaten hinterlegt */
  custom: z.boolean().optional(),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

/** Vorteil/Nachteil/SF am Charakter, optional mit Stufe und tatsächlich gezahlten AP. */
export const OwnedAbilitySchema = EntityRefSchema.extend({
  level: z.number().int().min(1).optional(),
  /** Freitext-Spezifizierung, z. B. gewähltes Talent bei "Begabung" */
  detail: z.string().optional(),
  apCost: z.number().int().optional(),
});
export type OwnedAbility = z.infer<typeof OwnedAbilitySchema>;

export const SkillValueSchema = EntityRefSchema.extend({
  value: z.number().int().min(0),
  /** Eigene Probe (nur bei custom), z. B. "MU/KL/CH" */
  check: z.string().optional(),
  /** Eigene Steigerungsspalte (nur bei custom) */
  improvementColumn: ImprovementColumnSchema.optional(),
});
export type SkillValue = z.infer<typeof SkillValueSchema>;

/** Talente dürfen im Homebrew bis -2; sonst identisch zu SkillValue. */
export const TalentValueSchema = SkillValueSchema.extend({
  value: z.number().int().min(-2),
});
export type TalentValue = z.infer<typeof TalentValueSchema>;

export const EquipmentEntrySchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  count: z.number().int().min(1).default(1),
  notes: z.string().optional(),
  custom: z.boolean().optional(),
  /** Freie Stat-Werte (nur bei custom): Gewicht, Preis */
  fields: CustomFieldsSchema.optional(),
});
export type EquipmentEntry = z.infer<typeof EquipmentEntrySchema>;

/** Geführte Waffe; die Kampftechnik wählt der Nutzer (Waffendaten nennen sie nicht). */
export const WeaponEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  combatTechniqueId: z.string().optional(),
  custom: z.boolean().optional(),
  /** Freie Stat-Werte (nur bei custom): TP, RW, "AT/PA-Mod" */
  fields: CustomFieldsSchema.optional(),
});
export type WeaponEntry = z.infer<typeof WeaponEntrySchema>;

export const ArmorEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  custom: z.boolean().optional(),
  /** Freie Stat-Werte (nur bei custom): Rüstungsschutz, Belastungsstufe */
  fields: CustomFieldsSchema.optional(),
});
export type ArmorEntry = z.infer<typeof ArmorEntrySchema>;

export const AttributesSchema = z.object({
  MU: z.number().int().min(8).max(25).default(8),
  KL: z.number().int().min(8).max(25).default(8),
  IN: z.number().int().min(8).max(25).default(8),
  CH: z.number().int().min(8).max(25).default(8),
  FF: z.number().int().min(8).max(25).default(8),
  GE: z.number().int().min(8).max(25).default(8),
  KO: z.number().int().min(8).max(25).default(8),
  KK: z.number().int().min(8).max(25).default(8),
});
export type Attributes = z.infer<typeof AttributesSchema>;

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  player: z.string().optional(),
  notes: z.string().optional(),

  /**
   * Mit Abenteuerpunkten spielen? `false` für Homebrew-Systeme mit eigener
   * Werteverteilung: keine Kostenanzeige, kein AP-Budget, keine AP-Grenzen.
   */
  useAp: z.boolean().default(true),

  /** Gesamtbudget an Abenteuerpunkten (Standard-Erfahrungsgrad "Erfahren" = 1100) */
  apTotal: z.number().int().default(1100),

  /**
   * Homebrew-Fertigkeitspunkte (nur relevant bei useAp === false).
   * Ausgebbar auf Talente (1 FP = 1 Talentpunkt). Gesamt = Anfang + erhalten.
   */
  fpInitial: z.number().int().default(0),
  fpEarned: z.number().int().default(0),

  attributes: AttributesSchema.default({}),

  species: EntityRefSchema.optional(),
  culture: EntityRefSchema.optional(),
  profession: EntityRefSchema.optional(),

  advantages: z.array(OwnedAbilitySchema).default([]),
  disadvantages: z.array(OwnedAbilitySchema).default([]),
  specialAbilities: z.array(OwnedAbilitySchema).default([]),

  /** Talentwerte (nur abweichend von 0 gespeichert; Homebrew erlaubt bis -2) */
  talents: z.array(TalentValueSchema).default([]),
  /** Kampftechnikwerte (nur abweichend vom Basiswert 6 gespeichert) */
  combatTechniques: z.array(SkillValueSchema).default([]),

  spells: z.array(SkillValueSchema).default([]),
  rituals: z.array(SkillValueSchema).default([]),
  cantrips: z.array(EntityRefSchema).default([]),
  liturgies: z.array(SkillValueSchema).default([]),
  ceremonies: z.array(SkillValueSchema).default([]),
  blessings: z.array(EntityRefSchema).default([]),

  /** Leiteigenschaft der magischen/karmalen Tradition für AsP/KaP-Berechnung */
  magicTradition: z
    .object({ name: z.string(), primaryAttribute: AttributeIdSchema.optional() })
    .optional(),
  karmalTradition: z
    .object({ name: z.string(), primaryAttribute: AttributeIdSchema.optional() })
    .optional(),

  weapons: z.array(WeaponEntrySchema).default([]),
  armor: z.array(ArmorEntrySchema).default([]),

  equipment: z.array(EquipmentEntrySchema).default([]),
  money: z
    .object({
      dukaten: z.number().default(0),
      silbertaler: z.number().default(0),
      heller: z.number().default(0),
      kreuzer: z.number().default(0),
    })
    .default({}),

  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Character = z.infer<typeof CharacterSchema>;

/** Neuer, leerer Charakter mit Standardwerten. */
export function createEmptyCharacter(id: string, name: string, useAp = true): Character {
  const now = new Date().toISOString();
  return CharacterSchema.parse({
    id,
    name,
    useAp,
    createdAt: now,
    updatedAt: now,
  });
}
