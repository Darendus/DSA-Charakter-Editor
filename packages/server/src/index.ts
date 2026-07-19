import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { CharacterSchema, createEmptyCharacter } from "@dsa/schema";
import { CharacterStore } from "./characterStore";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DATA_DIR = join(REPO_ROOT, "data", "json");
const CHARACTERS_DIR = join(REPO_ROOT, "characters");
const CLIENT_DIST = join(REPO_ROOT, "packages", "client", "dist");

const PORT = Number(process.env.PORT ?? 5174);

const app = Fastify({ logger: { level: "warn" } });
const store = new CharacterStore(CHARACTERS_DIR);

// ---------------------------------------------------------------------------
// Regeldaten (gescrapte JSON-Dateien, read-only)
// ---------------------------------------------------------------------------

app.get("/api/data", async (_req, reply) => {
  const manifestPath = join(DATA_DIR, "index.json");
  if (!existsSync(manifestPath)) {
    return reply
      .status(404)
      .send({ error: "Keine Daten vorhanden. Bitte zuerst `npm run scrape` ausführen." });
  }
  return JSON.parse(await readFile(manifestPath, "utf8"));
});

app.get<{ Params: { category: string } }>("/api/data/:category", async (req, reply) => {
  const { category } = req.params;
  if (!/^[a-z0-9-]+$/.test(category)) return reply.status(400).send({ error: "Ungültige Kategorie" });
  const file = join(DATA_DIR, `${category}.json`);
  if (!existsSync(file)) {
    const available = existsSync(DATA_DIR)
      ? (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
      : [];
    return reply.status(404).send({ error: `Kategorie '${category}' nicht gefunden`, available });
  }
  reply.header("Cache-Control", "no-cache");
  return JSON.parse(await readFile(file, "utf8"));
});

// ---------------------------------------------------------------------------
// Charaktere (CRUD auf characters/*.json)
// ---------------------------------------------------------------------------

app.get("/api/characters", async () => store.list());

app.post<{ Body: { name?: string } }>("/api/characters", async (req, reply) => {
  const name = req.body?.name?.trim() || "Namenloser Held";
  const id = `${name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
  const character = createEmptyCharacter(id, name);
  return reply.status(201).send(await store.save(character));
});

app.get<{ Params: { id: string } }>("/api/characters/:id", async (req, reply) => {
  const character = await store.get(req.params.id);
  if (!character) return reply.status(404).send({ error: "Charakter nicht gefunden" });
  return character;
});

app.put<{ Params: { id: string } }>("/api/characters/:id", async (req, reply) => {
  const parsed = CharacterSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Ungültiger Charakter", details: parsed.error.issues });
  }
  if (parsed.data.id !== req.params.id) {
    return reply.status(400).send({ error: "ID in URL und Datensatz stimmen nicht überein" });
  }
  return store.save(parsed.data);
});

app.delete<{ Params: { id: string } }>("/api/characters/:id", async (req, reply) => {
  const removed = await store.remove(req.params.id);
  if (!removed) return reply.status(404).send({ error: "Charakter nicht gefunden" });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Produktionsmodus: gebautes Frontend ausliefern, falls vorhanden
// ---------------------------------------------------------------------------

if (existsSync(CLIENT_DIST)) {
  app.register(fastifyStatic, { root: CLIENT_DIST, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) return reply.status(404).send({ error: "Nicht gefunden" });
    return reply.sendFile("index.html");
  });
}

app
  .listen({ port: PORT, host: "127.0.0.1" })
  .then(() => console.log(`DSA-Server läuft auf http://localhost:${PORT}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
