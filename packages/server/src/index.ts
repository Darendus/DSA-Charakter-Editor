import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildServer } from "./app";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const PORT = Number(process.env.PORT ?? 5174);

const app = buildServer({
  dataDir: join(REPO_ROOT, "data", "json"),
  rawDir: join(REPO_ROOT, "data", "raw"),
  charactersDir: join(REPO_ROOT, "characters"),
  clientDist: join(REPO_ROOT, "packages", "client", "dist"),
});

app
  .listen({ port: PORT, host: "127.0.0.1" })
  .then(() => console.log(`DSA-Server läuft auf http://localhost:${PORT}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
