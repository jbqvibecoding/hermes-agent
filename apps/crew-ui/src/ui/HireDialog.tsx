/**
 * Hiring a teammate. Written for us rather than ported: Errand's `Dialogs.tsx`
 * is built around Runta's model-provider onboarding, which we do not have.
 *
 * Four fields, and the short list is the product claim. A teammate accumulates
 * its character through use — memory rules it is told, skills it learns — not
 * through a setup form, so asking for anything past "who are you and what is
 * your job" would be asking the operator to invent a personality before they
 * have seen the teammate work.
 *
 * The same dialog edits an existing teammate; only the name is then fixed,
 * because a teammate's id *is* its Hermes profile directory and renaming it
 * would move a directory out from under running turns.
 */

import { useEffect, useState } from "react";
import type { Agent, ModelProviderOption } from "../domain/types";
import { Select } from "./Select";

const EMOJI = ["🤖", "🔎", "📥", "📈", "🎖️", "🧭", "🛠️", "📚", "🧪", "✍️", "🗂️", "🛰️"];

export interface HireDraft {
  name: string;
  role: string;
  emoji: string;
  modelProviderId: string;
}

export function HireDialog({
  editing, providers, busy, error, onSubmit, onClose,
}: {
  editing?: Agent;
  providers: ModelProviderOption[];
  busy: boolean;
  error?: string;
  onSubmit(draft: HireDraft): Promise<void>;
  onClose(): void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [role, setRole] = useState(editing?.role ?? "");
  const [emoji, setEmoji] = useState(editing?.avatar || "🤖");
  const [providerId, setProviderId] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSubmit = Boolean(name.trim()) && !busy;

  return <div
    className="palette-backdrop"
    role="presentation"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <form
      className="crew-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? `Edit ${editing.name}` : "Hire a teammate"}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        void onSubmit({ name: name.trim(), role: role.trim(), emoji, modelProviderId: providerId });
      }}
    >
      <h2>{editing ? `Edit ${editing.name}` : "Hire a teammate"}</h2>

      <label className="crew-field">
        <span>Name</span>
        <input
          autoFocus={!editing}
          value={name}
          disabled={Boolean(editing)}
          placeholder="Scout"
          onChange={(event) => setName(event.target.value)}
        />
        {editing && <small>A teammate's name is its profile directory, so it cannot be changed here.</small>}
      </label>

      <label className="crew-field">
        <span>Their job, in one line</span>
        <input
          autoFocus={Boolean(editing)}
          value={role}
          placeholder="Turns a one-line question into a decision-ready brief with sources"
          onChange={(event) => setRole(event.target.value)}
        />
      </label>

      <div className="crew-field">
        <span>Face</span>
        <div className="crew-emoji-row">
          {EMOJI.map((option) => <button
            type="button"
            key={option}
            className={`crew-emoji ${option === emoji ? "selected" : ""}`}
            aria-label={`Use ${option}`}
            aria-pressed={option === emoji}
            onClick={() => setEmoji(option)}
          >{option}</button>)}
        </div>
      </div>

      {!editing && providers.length > 0 && <div className="crew-field">
        <span>Model</span>
        <Select
          ariaLabel="Model provider"
          placeholder="Same as your default profile"
          value={providerId}
          options={[
            // Cloning the default profile is what gives a new teammate working
            // credentials immediately, so it is the option that needs no
            // explanation and therefore the one that comes first.
            { value: "", label: "Same as your default profile" },
            ...providers.map((provider) => ({
              value: provider.id,
              label: provider.defaultModel ? `${provider.name} · ${provider.defaultModel}` : provider.name,
            })),
          ]}
          onChange={setProviderId}
        />
      </div>}

      {error && <p className="crew-dialog-error">{error}</p>}

      <div className="crew-dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
        <button className="primary-button" disabled={!canSubmit}>
          {busy ? "Working…" : editing ? "Save" : "Hire"}
        </button>
      </div>
    </form>
  </div>;
}
