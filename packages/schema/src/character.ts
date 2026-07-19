import { z } from "zod";
import { AttributeIdSchema } from "./entities";

/** Referenz auf einen gescrapten Eintrag (per id), Name redundant für Anzeige ohne Datenlookup. */
export const EntityRefSchema = z.object({
  id: z.string(),
  name: z.string(),
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
});
export type SkillValue = z.infer<typeof SkillValueSchema>;

export const EquipmentEntrySchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  count: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});
export type EquipmentEntry = z.infer<typeof EquipmentEntrySchema>;

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

  /** Gesamtbudget an Abenteuerpunkten (Standard-Erfahrungsgrad "Erfahren" = 1100) */
  apTotal: z.number().int().default(1100),

  attributes: AttributesSchema.default({}),

  species: EntityRefSchema.optional(),
  culture: EntityRefSchema.optional(),
  profession: EntityRefSchema.optional(),

  advantages: z.array(OwnedAbilitySchema).default([]),
  disadvantages: z.array(OwnedAbilitySchema).default([]),
  specialAbilities: z.array(OwnedAbilitySchema).default([]),

  /** Talentwerte (nur abweichend von 0 gespeichert) */
  talents: z.array(SkillValueSchema).default([]),
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
export function createEmptyCharacter(id: string, name: string): Character {
  const now = new Date().toISOString();
  return CharacterSchema.parse({
    id,
    name,
    createdAt: now,
    updatedAt: now,
  });
}
