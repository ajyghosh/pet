import { useState } from "react";
import { Check, Search, BookOpen } from "lucide-react";
import {
  characters,
  referenceCharacters,
  type CharacterId,
} from "../core/characters";
import type { Settings } from "../core/settings";
import { PetSprite } from "./PetSprite";
import { CompanionPreview } from "./CompanionPreview";
const pageSize = 24;
export function CharacterGallery({
  settings,
  frame,
  onSelect,
}: {
  settings: Settings;
  frame: number;
  onSelect: (id: CharacterId) => void;
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("All collections");
  const [style, setStyle] = useState("all");
  const [references, setReferences] = useState(false);
  const [page, setPage] = useState(0);
  const filtered = characters.filter(
    (c) =>
      (category === "All" || c.kind === category) &&
      (collection === "All collections" || c.collection === collection) &&
      (style === "all" || c.style === style) &&
      `${c.name} ${c.description}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const referenceList = referenceCharacters.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <>
      <div className="library-tabs" aria-label="Library availability">
        <button
          aria-pressed={!references}
          onClick={() => {
            setReferences(false);
            setPage(0);
          }}
        >
          Ready to join · {characters.length}
        </button>
        <button
          aria-pressed={references}
          onClick={() => {
            setReferences(true);
            setPage(0);
          }}
        >
          Reference ideas · {referenceCharacters.length}
        </button>
      </div>
      <div className="gallery-toolbar">
        {!references && (
          <div className="gallery-filters" aria-label="Character categories">
            {["All", "Animals", "People", "Fantasy"].map((kind) => (
              <button
                key={kind}
                aria-pressed={category === kind}
                onClick={() => {
                  setCategory(kind);
                  setPage(0);
                }}
              >
                {kind}
              </button>
            ))}
          </div>
        )}
        <label className="gallery-search">
          <Search size={16} />
          <input
            aria-label="Search characters"
            placeholder="Find a little friend…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      {!references && (
        <div className="collection-filters">
          <label>
            Collection
            <select
              aria-label="Character collection"
              value={collection}
              onChange={(e) => {
                setCollection(e.target.value);
                setPage(0);
              }}
            >
              {[
                "All collections",
                ...new Set(characters.map((c) => c.collection)),
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Art style
            <select
              aria-label="Character art style"
              value={style}
              onChange={(e) => {
                setStyle(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All styles</option>
              <option value="pixel-art">Pixel art</option>
              <option value="cute-3d">Cute 3D</option>
            </select>
          </label>
        </div>
      )}
      <p className="gallery-hint">
        {references
          ? "These 20 entries from your collection pack are reference ideas only. No artwork is included and they cannot be added to the desktop."
          : `${characters.length} original companions · 6 animations each · Included and offline. Select a friend, then Save changes.`}
      </p>
      {references ? (
        <div className="reference-grid">
          {!referenceList.length && (
            <p className="gallery-empty" role="status">
              No reference ideas match your search.
            </p>
          )}
          {referenceList.map((c) => (
            <article key={c.id} className="reference-card">
              <BookOpen size={20} />
              <div>
                <h3>{c.name}</h3>
                <span>Reference only · No sprite assets</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="character-grid">
            {filtered
              .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
              .map((c) => (
                <button
                  key={c.id}
                  className={`character-card ${settings.character === c.id ? "chosen" : ""}`}
                  aria-label={`Choose ${c.name}`}
                  aria-pressed={settings.character === c.id}
                  onClick={() => onSelect(c.id)}
                >
                  <div
                    className="character-art"
                    style={{ background: c.color }}
                  >
                    <span className="character-kind">
                      {c.style === "cute-3d" ? "Cute 3D" : c.kind}
                    </span>
                    {settings.character === c.id && (
                      <span className="character-check">
                        <Check size={16} />
                      </span>
                    )}
                    <div className="character-sprite">
                      <PetSprite
                        character={c.id}
                        coat={settings.coat}
                        animation={
                          settings.character === c.id ? "happy" : "idle"
                        }
                        frame={frame}
                      />
                    </div>
                    <span className="character-ground" />
                  </div>
                  <strong>{c.name}</strong>
                  <span className="character-description">{c.description}</span>
                </button>
              ))}
          </div>
          {!filtered.length && (
            <p className="gallery-empty">
              No companions match. Try a different collection, style, or search.
            </p>
          )}
          {filtered.length > pageSize && (
            <div className="gallery-pagination">
              <button
                className="secondary-button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous characters
              </button>
              <span>
                Page {currentPage + 1} of {lastPage + 1} · {filtered.length}{" "}
                companions
              </span>
              <button
                className="secondary-button"
                disabled={currentPage === lastPage}
                onClick={() => setPage(currentPage + 1)}
              >
                Next characters
              </button>
            </div>
          )}
          <div className="gallery-preview">
            <div className="section-heading">
              <div>
                <h2>Meet {settings.name} in motion.</h2>
                <p>Try every animation before saving your choice.</p>
              </div>
            </div>
            <CompanionPreview settings={settings} />
          </div>
        </>
      )}
    </>
  );
}
