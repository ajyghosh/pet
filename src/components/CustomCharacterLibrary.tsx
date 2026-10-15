import { exportPreset } from "../api";
import { useState } from "react";
import {
  creatorOptions,
  defaultAppearance,
  duplicateCustomCharacter,
  newCustomCharacter,
  validateCustomCharacter,
  MAX_CUSTOM_CHARACTERS,
  type CustomCharacter,
  type Appearance,
} from "../core/customCharacters";
import type { Settings } from "../core/settings";
import { CompanionPreview } from "./CompanionPreview";
import { PetSprite } from "./PetSprite";

const labels: Record<keyof Appearance, string> = {
  base: "Body",
  skinTone: "Skin tone",
  faceShape: "Face shape",
  eyeStyle: "Eyes",
  browStyle: "Brows",
  facialHair: "Facial hair",
  hairStyle: "Hair style",
  hairColor: "Hair color",
  outfit: "Clothing",
  outfitColor: "Clothing color",
  shoes: "Shoes",
  accessories: "Accessories",
};
const readable = (value: string) => value.replaceAll("-", " ");
export function CustomCharacterLibrary({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CustomCharacter | null>(null);
  const [history, setHistory] = useState<CustomCharacter[]>([]);
  const [error, setError] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [facing, setFacing] = useState(1);
  const full = settings.customCharacters.length >= MAX_CUSTOM_CHARACTERS;
  function edit(character: CustomCharacter) {
    setDraft(structuredClone(character));
    setHistory([]);
    setCreating(false);
    setError("");
  }
  function update(next: CustomCharacter) {
    if (draft) setHistory((h) => [...h.slice(-29), draft]);
    setDraft(next);
    setError("");
  }
  function saveDraft() {
    try {
      const valid = validateCustomCharacter(draft);
      const existing = settings.customCharacters.some((c) => c.id === valid.id);
      if (!existing && full)
        throw Error("You can save up to 50 custom characters.");
      onChange({
        ...settings,
        name: settings.character === valid.id ? valid.name : settings.name,
        customCharacters: existing
          ? settings.customCharacters.map((c) =>
              c.id === valid.id ? valid : c,
            )
          : [...settings.customCharacters, valid],
      });
      setDraft(null);
    } catch (e) {
      setError(String(e));
    }
  }
  async function exportCharacter(character: CustomCharacter) {
    try {
      setExportStatus(await exportPreset(character));
    } catch (e) {
      setExportStatus(`Export failed: ${String(e)}`);
    }
  }
  return (
    <section
      className="settings-card custom-library"
      aria-label="Custom character library"
    >
      <div className="section-heading">
        <div>
          <h2>My Custom Characters</h2>
          <p>Create an original little human, entirely on this device.</p>
        </div>
        <button
          className="primary-button"
          disabled={full}
          onClick={() => {
            setCreating(true);
            setDraft(null);
          }}
        >
          Create Character
        </button>
      </div>
      <p>
        Save changes at the bottom to keep library edits and apply your desktop
        selection. One companion is active at a time.
      </p>
      {exportStatus && <p role="status">{exportStatus}</p>}
      {creating && (
        <div className="creator-paths">
          <button
            className="secondary-button"
            onClick={() => edit(newCustomCharacter())}
          >
            Create Manually
          </button>
          <button className="secondary-button" disabled>
            Create from Photo · Unavailable in beta
          </button>
          <button className="text-button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </div>
      )}
      {draft && (
        <div className="character-editor" aria-label="Manual character creator">
          <h3>
            {settings.customCharacters.some((c) => c.id === draft.id)
              ? "Edit character"
              : "Create manually"}
          </h3>
          <div className="creator-fields">
            <label>
              Character name
              <input
                value={draft.name}
                maxLength={80}
                onChange={(e) => update({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Personality
              <input
                value={draft.personality}
                maxLength={100}
                onChange={(e) =>
                  update({ ...draft, personality: e.target.value })
                }
              />
            </label>
            {Object.entries(creatorOptions)
              .filter(([key]) => key !== "accessories")
              .map(([key, choices]) => (
                <label key={key}>
                  {labels[key as keyof Appearance]}
                  <select
                    aria-label={labels[key as keyof Appearance]}
                    value={draft.appearance[key as keyof Appearance] as string}
                    onChange={(e) =>
                      update({
                        ...draft,
                        appearance: {
                          ...draft.appearance,
                          [key]: e.target.value,
                        },
                      })
                    }
                  >
                    {choices.map((choice) => (
                      <option value={choice} key={choice}>
                        {readable(choice)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            <label>
              Clothing color
              <input
                type="color"
                value={draft.appearance.outfitColor}
                onChange={(e) =>
                  update({
                    ...draft,
                    appearance: {
                      ...draft.appearance,
                      outfitColor: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
          <fieldset>
            <legend>Accessories</legend>
            {creatorOptions.accessories.map((a) => (
              <label key={a} className="accessory-choice">
                <input
                  type="checkbox"
                  checked={draft.appearance.accessories.includes(a)}
                  onChange={(e) =>
                    update({
                      ...draft,
                      appearance: {
                        ...draft.appearance,
                        accessories: e.target.checked
                          ? [...draft.appearance.accessories, a]
                          : draft.appearance.accessories.filter(
                              (item) => item !== a,
                            ),
                      },
                    })
                  }
                />
                {readable(a)}
              </label>
            ))}
          </fieldset>
          <div className="creator-actions">
            <button
              className="secondary-button"
              onClick={() => setFacing(-1)}
              aria-pressed={facing < 0}
            >
              Face left
            </button>
            <button
              className="secondary-button"
              onClick={() => setFacing(1)}
              aria-pressed={facing > 0}
            >
              Face right
            </button>
            <button
              className="text-button"
              disabled={!history.length}
              onClick={() => {
                setDraft(history.at(-1)!);
                setHistory(history.slice(0, -1));
              }}
            >
              Undo
            </button>
            <button
              className="text-button"
              onClick={() =>
                update({
                  ...draft,
                  appearance: structuredClone(defaultAppearance),
                })
              }
            >
              Reset appearance
            </button>
          </div>
          <CompanionPreview
            settings={{ ...settings, character: draft.id, name: draft.name }}
            customCharacter={draft}
            facing={facing}
          />
          <p>
            Six shared animations: idle, walk, wave, jump, drink water and
            sleep. Sitting, dancing and stretching are unavailable. Available
            views are left and right.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="creator-actions">
            <button className="primary-button" onClick={saveDraft}>
              Keep character
            </button>
            <button className="text-button" onClick={() => setDraft(null)}>
              Cancel editing
            </button>
          </div>
        </div>
      )}
      {!settings.customCharacters.length && !draft && (
        <p>No custom characters yet.</p>
      )}
      <div className="custom-character-list">
        {settings.customCharacters.map((c) => (
          <article
            key={c.id}
            className="custom-character-card"
            aria-label={`Custom character ${c.name}`}
          >
            <div className="custom-character-art">
              <PetSprite character={c.id} customCharacter={c} />
            </div>
            <h3>{c.name}</h3>
            <p>{c.personality}</p>
            <div className="creator-actions">
              <button className="secondary-button" onClick={() => edit(c)}>
                Preview / Edit / Rename
              </button>
              <button
                className="secondary-button"
                disabled={full}
                onClick={() => edit(duplicateCustomCharacter(c))}
              >
                Duplicate
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  void exportCharacter(c);
                }}
              >
                Export preset
              </button>
              <button
                className="primary-button"
                aria-pressed={settings.character === c.id}
                onClick={() =>
                  onChange({ ...settings, character: c.id, name: c.name })
                }
              >
                Add to Desktop
              </button>
              <button className="text-button" onClick={() => setDeleting(c.id)}>
                Delete
              </button>
            </div>
            {deleting === c.id && (
              <div role="group" aria-label={`Delete ${c.name}`}>
                <p>Remove this character? Save changes to keep the deletion.</p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    const active = settings.character === c.id;
                    onChange({
                      ...settings,
                      customCharacters: settings.customCharacters.filter(
                        (item) => item.id !== c.id,
                      ),
                      ...(active ? { character: "alex", name: "Alex" } : {}),
                    });
                    setDeleting(null);
                  }}
                >
                  Confirm delete
                </button>
                <button
                  className="text-button"
                  onClick={() => setDeleting(null)}
                >
                  Cancel deletion
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {full && (
        <p>Library limit reached (50). Delete a character to make room.</p>
      )}
      <p>
        Export contains appearance metadata for this renderer, with no photos or
        external assets. Pack import and photo conversion are unavailable.
      </p>
    </section>
  );
}
