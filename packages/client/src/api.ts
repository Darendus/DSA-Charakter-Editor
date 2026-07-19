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

export const api = {
  manifest: () => request<DataManifest>("/api/data"),
  category: (key: string) => request<CategoryFile>(`/api/data/${key}`),

  characters: () => request<Character[]>("/api/characters"),
  character: (id: string) => request<Character>(`/api/characters/${id}`),
  createCharacter: (name: string) =>
    request<Character>("/api/characters", { method: "POST", body: JSON.stringify({ name }) }),
  saveCharacter: (character: Character) =>
    request<Character>(`/api/characters/${character.id}`, {
      method: "PUT",
      body: JSON.stringify(character),
    }),
  deleteCharacter: (id: string) =>
    request<{ ok: boolean }>(`/api/characters/${id}`, { method: "DELETE" }),
};
