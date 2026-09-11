import { applyToolbarChange, layerDatasetProp, parseStoredUi, readUiState, UI_LAYERS } from "./ui-state.js";
import { bookSlides, clampSlide, pickSlideIndex, slideIndexContaining } from "./slides.js";

const root = document.documentElement;
const book = document.querySelector(".book");

/** @type {Element[]} */
let slides = [];
let slideIndex = 0;

function presentLayers() {
  return new Set([...document.querySelectorAll('input[name="layer"]')].map((el) => el.value));
}

function paintSlide() {
  for (const [j, el] of slides.entries()) el.classList.toggle("is-current", j === slideIndex);
}

function hashTarget() {
  const id = location.hash.replace(/^#/, "");
  return id ? document.getElementById(id) : null;
}

function revealHash() {
  const target = hashTarget();
  if (target) target.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function syncSlides(state, followHash) {
  if (!book) return;
  if (state.dir !== "v") {
    for (const el of slides) el.classList.remove("is-current");
    slides = [];
    root.removeAttribute("data-slides");
    return;
  }
  slides = /** @type {Element[]} */ (bookSlides(book));
  slideIndex = pickSlideIndex(slideIndex, slides.length, slideIndexContaining(slides, hashTarget()), followHash);
  paintSlide();
  root.setAttribute("data-slides", "");
  if (followHash) revealHash();
}

function stepSlide(delta) {
  slideIndex = clampSlide(slideIndex + delta, slides.length);
  paintSlide();
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
  syncSlides(state, slides.length === 0);
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
    if (!(t instanceof HTMLInputElement) || !t.name) return;
    state = applyToolbarChange(state, t.name, t.value, t.checked);
    apply(state);
  });
}

if (book) {
  book.addEventListener("click", (ev) => {
    if (state.dir !== "v" || !root.hasAttribute("data-slides")) return;
    const hit = ev.target;
    if (!(hit instanceof Element) || hit.closest("a, input, button, label, textarea, select")) return;
    const rect = book.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    if (x < rect.width / 4) stepSlide(-1);
    else if (x > (rect.width * 3) / 4) stepSlide(1);
  });
}

document.addEventListener("keydown", (ev) => {
  if (state.dir !== "v" || !root.hasAttribute("data-slides")) return;
  const hit = ev.target;
  if (hit instanceof Element && hit.closest("input, textarea, select, button")) return;
  if (ev.key === "ArrowRight" || ev.key === "PageDown" || ev.key === " ") {
    ev.preventDefault();
    stepSlide(1);
  } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
    ev.preventDefault();
    stepSlide(-1);
  } else if (ev.key === "Home") {
    ev.preventDefault();
    stepSlide(-slideIndex);
  } else if (ev.key === "End") {
    ev.preventDefault();
    stepSlide(slides.length);
  }
});

window.addEventListener("hashchange", () => {
  if (state.dir === "v") syncSlides(state, true);
});
