// Dev-Launcher: startet Electron mit bereinigter Umgebung.
// (VS-Code-/Extension-Umgebungen setzen ELECTRON_RUN_AS_NODE=1, was
// electron.exe zu einem normalen Node-Prozess degradiert.)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ["."], {
  stdio: "inherit",
  env,
  cwd: dirname(fileURLToPath(import.meta.url)),
});
child.on("exit", (code) => process.exit(code ?? 0));
