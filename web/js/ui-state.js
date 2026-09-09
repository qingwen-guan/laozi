/**
 * @typedef {import("../../src/types.js").Script} Script
 * @typedef {import("../../src/types.js").Dir} Dir
 * @typedef {import("../../src/types.js").Theme} Theme
 */

export const UI_SCRIPTS = /** @type {ReadonlySet<Script>} */ (new Set(["hant", "hans"]));
export const UI_DIRS = /** @type {ReadonlySet<Dir>} */ (new Set(["h", "v"]));
export const UI_THEMES = /** @type {ReadonlySet<Theme>} */ (new Set(["modern", "xianzhuang"]));
export const UI_LAYERS = /** @type {const} */ (["jiaokan", "yiwen", "anyu"]);

/**
 * @typedef {(typeof UI_LAYERS)[number]} UiLayer
 * @typedef {{ script: Script, dir: Dir, theme: Theme } & Record<UiLayer, boolean>} UiState
 */

export const UI_DEFAULTS = /** @type {UiState} */ ({
  script: "hant",
  dir: "h",
  theme: "modern",
  ...Object.fromEntries(UI_LAYERS.map((key) => [key, true])),
});

/**
 * @template {string} T
 * @param {unknown} value
 * @param {ReadonlySet<T>} allowed
 * @param {T} fallback
 * @returns {T}
 */
export function pick(value, allowed, fallback) {
  return typeof value === "string" && allowed.has(/** @type {T} */ (value)) ? /** @type {T} */ (value) : fallback;
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function flag(value, fallback) {
  if (value === true || value === "1" || value === "true") return true;
  if (value === false || value === "0" || value === "false") return false;
  return fallback;
}

/**
 * @param {string | null} raw
 * @returns {Record<string, unknown>}
 */
export function parseStoredUi(raw) {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/**
 * @param {UiLayer} key
 * @returns {string}
 */
export function layerDatasetProp(key) {
  return `layer${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
}

/**
 * @param {{ get(name: string): string | null; has(name: string): boolean }} query
 * @param {Record<string, unknown>} stored
 * @param {UiState} [defaults]
 * @returns {UiState}
 */
export function readUiState(query, stored, defaults = UI_DEFAULTS) {
  const script = pick(query.get("script"), UI_SCRIPTS, pick(stored.script, UI_SCRIPTS, defaults.script));
  const dir = pick(query.get("dir"), UI_DIRS, pick(stored.dir, UI_DIRS, defaults.dir));
  let theme = pick(query.get("theme"), UI_THEMES, pick(stored.theme, UI_THEMES, defaults.theme));
  if (dir === "h") theme = "modern";
  const layers = /** @type {Record<UiLayer, boolean>} */ (
    Object.fromEntries(
      UI_LAYERS.map((key) => {
        const value = query.has(key)
          ? flag(query.get(key), flag(stored[key], defaults[key]))
          : flag(stored[key], defaults[key]);
        return [key, value];
      }),
    )
  );
  return { script, dir, theme, ...layers };
}

/**
 * @param {UiState} state
 * @param {string} name
 * @param {string} value
 * @param {boolean} checked
 * @returns {UiState}
 */
export function applyToolbarChange(state, name, value, checked) {
  const next = { ...state };
  if (name === "script") next.script = pick(value, UI_SCRIPTS, state.script);
  if (name === "dir") {
    next.dir = pick(value, UI_DIRS, state.dir);
    if (next.dir === "h") next.theme = "modern";
  }
  if (name === "theme") next.theme = pick(value, UI_THEMES, state.theme);
  if (name === "layer" && /** @type {readonly string[]} */ (UI_LAYERS).includes(value)) {
    next[/** @type {UiLayer} */ (value)] = checked;
  }
  return next;
}
