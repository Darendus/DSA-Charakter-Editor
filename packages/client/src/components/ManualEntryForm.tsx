import { useState } from "react";

export interface ManualField {
  key: string;
  label: string;
  /** Freitext (Standard) oder Auswahl */
  options?: string[];
  placeholder?: string;
  /** Reine Zahl (z. B. RS/BE) — verhindert stille 0-Werte in Summen */
  numeric?: boolean;
}

interface Props {
  /** Überschrift, z. B. "Eigene Waffe anlegen" */
  legend: string;
  /** Zusätzliche Felder neben dem Namen */
  fields?: ManualField[];
  addLabel?: string;
  /** name = Pflichtfeld; values enthält die (nicht leeren) Zusatzfelder */
  onAdd: (name: string, values: Record<string, string>) => void;
}

/**
 * Kleines Formular zum manuellen Anlegen eigener Einträge im Homebrew-Modus.
 * Der Aufrufer entscheidet, wie die Werte ins jeweilige Schema abgebildet werden.
 */
export function ManualEntryForm({ legend, fields = [], addLabel = "Hinzufügen", onAdd }: Props) {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleaned: Record<string, string> = {};
    for (const field of fields) {
      const v = values[field.key]?.trim();
      if (v) cleaned[field.key] = v;
    }
    onAdd(trimmed, cleaned);
    setName("");
    setValues({});
  };

  return (
    <div className="manual-entry">
      <span className="manual-legend muted small">{legend}</span>
      <div className="manual-fields">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {fields.map((field) =>
          field.options ? (
            <select
              key={field.key}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              title={field.label}
            >
              <option value="">{field.label}</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={field.key}
              type={field.numeric ? "number" : "text"}
              placeholder={field.placeholder ?? field.label}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          )
        )}
        <button onClick={submit} disabled={!name.trim()}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}
