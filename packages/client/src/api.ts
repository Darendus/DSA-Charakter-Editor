import type { CategoryFile, Character, DataManifest } from "@dsa/schema";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // Antwort war kein JSON
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export interface ScrapeStatus {
  running: boolean;
  startedAt?: string;
  finishedAt?: string;
  log: string[];
  summary?: { aborted: boolean; categories: { category: string; count: number }[] };
  error?: string;
}

export const api = {
  manifest: () => request<DataManifest>("/api/data"),
  category: (key: string) => request<CategoryFile>(`/api/data/${key}`),

  startScrape: (options: { categories?: string[]; force?: boolean }) =>
    request<ScrapeStatus>("/api/scrape", { method: "POST", body: JSON.stringify(options) }),
  scrapeStatus: () => request<ScrapeStatus>("/api/scrape/status"),
  cancelScrape: () => request<{ ok: boolean }>("/api/scrape/cancel", { method: "POST" }),

  characters: () => request<Character[]>("/api/characters"),
  character: (id: string) => request<Character>(`/api/characters/${id}`),
  createCharacter: (name: string, useAp: boolean) =>
    request<Character>("/api/characters", {
      method: "POST",
      body: JSON.stringify({ name, useAp }),
    }),
  saveCharacter: (character: Character) =>
    request<Character>(`/api/characters/${character.id}`, {
      method: "PUT",
      body: JSON.stringify(character),
    }),
  deleteCharacter: (id: string) =>
    request<{ ok: boolean }>(`/api/characters/${id}`, { method: "DELETE" }),
};
