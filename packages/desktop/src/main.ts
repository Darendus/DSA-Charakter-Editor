import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { BrowserWindow, app, shell } from "electron";
import { buildServer } from "@dsa/server";

/**
 * Desktop-Hülle: startet den eingebetteten Fastify-Server auf einem freien
 * localhost-Port und öffnet das gebaute Frontend in einem Electron-Fenster.
 *
 * Paketiert liegen die Daten unter %APPDATA%/dsa-charakter-editor; im
 * Entwicklungsmodus (nicht paketiert) werden die Repo-Verzeichnisse benutzt,
 * damit bereits gescrapte Daten und Charaktere direkt verfügbar sind.
 */
async function start(): Promise<void> {
  // Ohne expliziten Pfad landet userData unter "@dsa/desktop" (npm-Paketname)
  app.setPath("userData", join(app.getPath("appData"), "dsa-charakter-editor"));
  await app.whenReady();

  const repoRoot = resolve(__dirname, "../../..");
  const baseDir = app.isPackaged ? app.getPath("userData") : repoRoot;

  const dataDir = join(baseDir, "data", "json");
  const rawDir = join(baseDir, "data", "raw");
  const charactersDir = join(baseDir, "characters");
  for (const dir of [dataDir, rawDir, charactersDir]) mkdirSync(dir, { recursive: true });

  const clientDist = app.isPackaged
    ? join(__dirname, "client")
    : join(repoRoot, "packages", "client", "dist");

  const server = buildServer({ dataDir, rawDir, charactersDir, clientDist });
  await server.listen({ port: 0, host: "127.0.0.1" });
  const address = server.server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    autoHideMenuBar: true,
    title: "DSA Charakter-Editor",
    backgroundColor: "#191613",
  });

  // Externe Links (z. B. "Im Regelwiki öffnen") im Standardbrowser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  await win.loadURL(`http://127.0.0.1:${port}`);

  app.on("window-all-closed", () => {
    void server.close();
    app.quit();
  });
}

start().catch((error) => {
  console.error(error);
  app.quit();
});
