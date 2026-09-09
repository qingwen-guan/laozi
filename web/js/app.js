import { applyToolbarChange, layerDatasetProp, parseStoredUi, readUiState, UI_LAYERS } from "./ui-state.js";

const root = document.documentElement;

function presentLayers() {
  return new Set([...document.querySelectorAll('input[name="layer"]')].map((el) => el.value));
}

function apply(state) {
  root.dataset.script = state.script;
  root.dataset.dir = state.dir;
  root.dataset.theme = state.theme;
  const present = presentLayers();
  for (const key of UI_LAYERS) {
    const prop = layerDatasetProp(key);
    if (present.has(key)) root.dataset[prop] = state[key] ? "on" : "off";
    else delete root.dataset[prop];
  }
  root.lang = state.script === "hant" ? "zh-Hant" : "zh-Hans";
  const titles = { hant: root.dataset.titleHant, hans: root.dataset.titleHans };
  if (titles[state.script]) document.title = titles[state.script];
  document.querySelectorAll('input[name="script"]').forEach((el) => {
    el.checked = el.value === state.script;
  });
  document.querySelectorAll('input[name="dir"]').forEach((el) => {
    el.checked = el.value === state.dir;
  });
  document.querySelectorAll('input[name="theme"]').forEach((el) => {
    el.checked = el.value === state.theme;
  });
  document.querySelectorAll('input[name="layer"]').forEach((el) => {
    el.checked = !!state[el.value];
  });
  const themeSet = document.querySelector("[data-theme-set]");
  if (themeSet) {
    themeSet.classList.toggle("is-disabled", state.dir === "h");
    document.querySelectorAll('input[name="theme"]').forEach((el) => {
      el.disabled = state.dir === "h";
    });
  }
  try {
    localStorage.setItem("laozi-ui", JSON.stringify(state));
  } catch {}
}

let raw = null;
try {
  raw = localStorage.getItem("laozi-ui");
} catch {}
let state = readUiState(new URLSearchParams(location.search), parseStoredUi(raw));
apply(state);

const toolbar = document.querySelector(".toolbar");
if (toolbar) {
  toolbar.addEventListener("change", (ev) => {
    const t = ev.target;
    if (!t.name) return;
    state = applyToolbarChange(state, t.name, t.value, t.checked);
    apply(state);
  });
}
