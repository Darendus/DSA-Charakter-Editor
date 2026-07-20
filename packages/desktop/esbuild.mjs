import { build } from "esbuild";
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Main-Prozess samt Workspace-Paketen (server, scraper, schema, fastify,
// cheerio, zod) in eine einzelne CJS-Datei bündeln - tsx/TS-Quellen stehen
// in der paketierten App nicht zur Verfügung.
await build({
  entryPoints: [join(here, "src", "main.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: join(here, "dist", "main.cjs"),
  external: ["electron"],
  sourcemap: false,
  logLevel: "info",
});

// Gebautes Frontend neben den Main-Bundle legen (wird statisch ausgeliefert)
const clientDist = resolve(here, "..", "client", "dist");
const target = join(here, "dist", "client");
if (existsSync(clientDist)) {
  rmSync(target, { recursive: true, force: true });
  cpSync(clientDist, target, { recursive: true });
  console.log(`Client kopiert: ${target}`);
} else {
  console.warn("WARNUNG: packages/client/dist fehlt - erst `npm run build -w @dsa/client`");
}
