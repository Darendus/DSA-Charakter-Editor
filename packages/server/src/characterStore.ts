import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CharacterSchema, type Character } from "@dsa/schema";

/**
 * Charaktere liegen als einzelne JSON-Dateien in characters/ -
 * bewusst simpel gehalten, damit sie von Hand editiert, kopiert
 * und versioniert werden können.
 */
export class CharacterStore {
  constructor(private readonly dir: string) {}

  private pathFor(id: string): string {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Ungültige Charakter-ID: ${id}`);
    return join(this.dir, `${id}.json`);
  }

  async list(): Promise<Character[]> {
    await mkdir(this.dir, { recursive: true });
    const files = (await readdir(this.dir)).filter((f) => f.endsWith(".json"));
    const characters: Character[] = [];
    for (const file of files) {
      try {
        const raw = JSON.parse(await readFile(join(this.dir, file), "utf8"));
        characters.push(CharacterSchema.parse(raw));
      } catch {
        // defekte Datei überspringen statt die ganze Liste zu blockieren
      }
    }
    return characters.sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  async get(id: string): Promise<Character | undefined> {
    try {
      const raw = JSON.parse(await readFile(this.pathFor(id), "utf8"));
      return CharacterSchema.parse(raw);
    } catch {
      return undefined;
    }
  }

  async save(character: Character): Promise<Character> {
    const validated = CharacterSchema.parse({
      ...character,
      updatedAt: new Date().toISOString(),
    });
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(validated.id), JSON.stringify(validated, null, 2), "utf8");
    return validated;
  }

  async remove(id: string): Promise<boolean> {
    try {
      await rm(this.pathFor(id));
      return true;
    } catch {
      return false;
    }
  }
}
