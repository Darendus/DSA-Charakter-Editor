import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { CharacterSchema, createEmptyCharacter } from "@dsa/schema";
import { categoryKeys } from "@dsa/scraper";
import { CharacterStore } from "./characterStore";
import { ScrapeJobManager } from "./scrapeJob";

export interface ServerOptions {
  /** Verzeichnis der gescrapten JSON-Dateien (data/json) */
  dataDir: string;
  /** HTML-Cache des Scrapers (data/raw) */
  rawDir: string;
  /** Charakter-Ablage */
  charactersDir: string;
  /** Gebauter Client (dist) - wird statisch ausgeliefert, falls vorhanden */
  clientDist?: string;
}

/** Baut die Fastify-App - genutzt vom Dev-Einstieg (index.ts) und von Electron. */
export function buildServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: { level: "warn" } });
  const store = new CharacterStore(options.charactersDir);
  const scrapeJobs = new ScrapeJobManager({ rawDir: options.rawDir, outDir: options.dataDir });

  // -------------------------------------------------------------------------
  // Regeldaten (gescrapte JSON-Dateien, read-only)
  // -------------------------------------------------------------------------

  app.get("/api/data", async (_req, reply) => {
    const manifestPath = join(options.dataDir, "index.json");
    if (!existsSync(manifestPath)) {
      return reply
        .status(404)
        .send({ error: "Keine Daten vorhanden. Bitte zuerst die Regeldaten aktualisieren." });
    }
    return JSON.parse(await readFile(manifestPath, "utf8"));
  });

  app.get<{ Params: { category: string } }>("/api/data/:category", async (req, reply) => {
    const { category } = req.params;
    if (!/^[a-z0-9-]+$/.test(category))
      return reply.status(400).send({ error: "Ungültige Kategorie" });
    const file = join(options.dataDir, `${category}.json`);
    if (!existsSync(file)) {
      const available = existsSync(options.dataDir)
        ? (await readdir(options.dataDir))
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(/\.json$/, ""))
        : [];
      return reply.status(404).send({ error: `Kategorie '${category}' nicht gefunden`, available });
    }
    reply.header("Cache-Control", "no-cache");
    return JSON.parse(await readFile(file, "utf8"));
  });

  // -------------------------------------------------------------------------
  // Scraper-Steuerung
  // -------------------------------------------------------------------------

  app.post<{ Body: { categories?: string[]; force?: boolean; limit?: number } | null }>(
    "/api/scrape",
    async (req, reply) => {
      const body = req.body ?? {};
      const known = categoryKeys();
      const categories = body.categories?.filter((c) => known.includes(c));
      if (body.categories && categories?.length !== body.categories.length) {
        return reply.status(400).send({ error: "Unbekannte Kategorien enthalten", known });
      }
      const started = scrapeJobs.start({
        categories,
        force: body.force,
        limit: body.limit,
      });
      if (!started) return reply.status(409).send({ error: "Es läuft bereits ein Scrape-Lauf" });
      return reply.status(202).send(scrapeJobs.getStatus());
    }
  );

  app.get("/api/scrape/status", async () => scrapeJobs.getStatus());

  app.post("/api/scrape/cancel", async (_req, reply) => {
    if (!scrapeJobs.cancel()) return reply.status(409).send({ error: "Kein Lauf aktiv" });
    return { ok: true };
  });

  // -------------------------------------------------------------------------
  // Charaktere (CRUD auf characters/*.json)
  // -------------------------------------------------------------------------

  app.get("/api/characters", async () => store.list());

  app.post<{ Body: { name?: string; useAp?: boolean } }>("/api/characters", async (req, reply) => {
    const name = req.body?.name?.trim() || "Namenloser Held";
    const useAp = req.body?.useAp ?? true;
    const id = `${name
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
    const character = createEmptyCharacter(id, name, useAp);
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

  // -------------------------------------------------------------------------
  // Produktionsmodus: gebautes Frontend ausliefern, falls vorhanden
  // -------------------------------------------------------------------------

  if (options.clientDist && existsSync(options.clientDist)) {
    app.register(fastifyStatic, { root: options.clientDist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) return reply.status(404).send({ error: "Nicht gefunden" });
      return reply.sendFile("index.html");
    });
  }

  return app;
}
