import type { CategoryFile, Character, DataManifest, EntityBase } from "@dsa/schema";
import { create } from "zustand";
import { api } from "./api";

/** Cache für die gescrapten Regeldaten — jede Kategorie wird nur einmal geladen. */
interface DataState {
  manifest?: DataManifest;
  manifestError?: string;
  categories: Record<string, CategoryFile>;
  loading: Record<string, boolean>;
  loadManifest: () => Promise<void>;
  loadCategory: (key: string) => Promise<void>;
  entriesOf: (key: string) => EntityBase[];
  findEntry: (key: string, id: string) => EntityBase | undefined;
}

export const useDataStore = create<DataState>((set, get) => ({
  categories: {},
  loading: {},

  loadManifest: async () => {
    if (get().manifest) return;
    try {
      set({ manifest: await api.manifest(), manifestError: undefined });
    } catch (error) {
      set({ manifestError: String(error instanceof Error ? error.message : error) });
    }
  },

  loadCategory: async (key) => {
    const { categories, loading } = get();
    if (categories[key] || loading[key]) return;
    set((s) => ({ loading: { ...s.loading, [key]: true } }));
    try {
      const file = await api.category(key);
      set((s) => ({ categories: { ...s.categories, [key]: file } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, [key]: false } }));
    }
  },

  entriesOf: (key) => get().categories[key]?.entries ?? [],
  findEntry: (key, id) => get().categories[key]?.entries.find((e) => e.id === id),
}));

/** Der gerade geöffnete Charakter samt Änderungsstatus. */
interface CharacterState {
  list: Character[];
  listLoaded: boolean;
  current?: Character;
  dirty: boolean;
  saving: boolean;
  error?: string;

  loadList: () => Promise<void>;
  open: (id: string) => Promise<void>;
  create: (name: string) => Promise<Character>;
  update: (patch: Partial<Character> | ((c: Character) => Character)) => void;
  save: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  close: () => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  list: [],
  listLoaded: false,
  dirty: false,
  saving: false,

  loadList: async () => {
    set({ list: await api.characters(), listLoaded: true });
  },

  open: async (id) => {
    set({ current: await api.character(id), dirty: false, error: undefined });
  },

  create: async (name) => {
    const character = await api.createCharacter(name);
    set((s) => ({ list: [...s.list, character] }));
    return character;
  },

  update: (patch) => {
    const current = get().current;
    if (!current) return;
    const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
    set({ current: next, dirty: true });
  },

  save: async () => {
    const current = get().current;
    if (!current) return;
    set({ saving: true, error: undefined });
    try {
      const saved = await api.saveCharacter(current);
      set((s) => ({
        current: saved,
        dirty: false,
        list: s.list.map((c) => (c.id === saved.id ? saved : c)),
      }));
    } catch (error) {
      set({ error: String(error instanceof Error ? error.message : error) });
    } finally {
      set({ saving: false });
    }
  },

  remove: async (id) => {
    await api.deleteCharacter(id);
    set((s) => ({
      list: s.list.filter((c) => c.id !== id),
      current: s.current?.id === id ? undefined : s.current,
    }));
  },

  close: () => set({ current: undefined, dirty: false }),
}));
