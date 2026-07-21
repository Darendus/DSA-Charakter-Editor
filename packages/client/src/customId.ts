/** Eindeutige ID für manuell (Homebrew) angelegte Einträge. */
export function customId(): string {
  return `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
