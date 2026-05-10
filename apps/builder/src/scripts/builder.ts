// ── Color math (ported from ThemeBuilder) ───────────

function toLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function toGamma(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}
function hexToOklch(hex: string): { hue: number; chroma: number } | null {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = toLinear(parseInt(clean.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(clean.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(clean.slice(4, 6), 16) / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return {
    chroma: Math.sqrt(a * a + bv * bv),
    hue: ((Math.atan2(bv, a) * 180) / Math.PI + 360) % 360,
  };
}
function oklchToHex(L: number, C: number, H: number): string {
  const hRad = (H * Math.PI) / 180,
    a = C * Math.cos(hRad),
    b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;
  const rl = Math.max(
    0,
    Math.min(1, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
  );
  const gl = Math.max(
    0,
    Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
  );
  const bl = Math.max(
    0,
    Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  );
  const rv = Math.round(toGamma(rl) * 255),
    gv = Math.round(toGamma(gl) * 255),
    bv = Math.round(toGamma(bl) * 255);
  return `#${rv.toString(16).padStart(2, "0")}${gv.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
}
function relativeLuminance(L: number, C: number, H: number): number {
  const hRad = (H * Math.PI) / 180,
    a = C * Math.cos(hRad),
    b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;
  const r = Math.max(
    0,
    Math.min(1, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
  );
  const g = Math.max(
    0,
    Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
  );
  const bv = Math.max(
    0,
    Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * bv;
}
function bestFg(bgL: number, bgC: number, bgH: number): string {
  const bgLum = relativeLuminance(bgL, bgC, bgH),
    wLum = relativeLuminance(0.98, 0, 0);
  const hi = Math.max(bgLum, wLum),
    lo = Math.min(bgLum, wLum);
  return (hi + 0.05) / (lo + 0.05) >= 4.5 ? "oklch(98% 0 0)" : "oklch(9% 0 0)";
}
function blendHue(primary: number, def: number): number {
  return (((def + (primary - 253.83) * 0.12) % 360) + 360) % 360;
}
function fmt(L: number, C: number, H: number): string {
  return `oklch(${Math.round(L * 100)}% ${C.toFixed(3)} ${Math.round(H)})`;
}

const SCALE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];
const NEUTRAL_SCALE = [
  [0.97, 1],
  [0.95, 0.8],
  [0.9, 1],
  [0.83, 1.2],
  [0.68, 1.8],
  [0.55, 2.1],
  [0.45, 2],
  [0.36, 1.8],
  [0.28, 1.4],
  [0.21, 1.2],
  [0.09, 0],
] as const;
const PRIMARY_SCALE = [
  [0.97, 0.08],
  [0.94, 0.16],
  [0.88, 0.33],
  [0.78, 0.55],
  [0.66, 0.82],
  [0.55, 1],
  [0.49, 1.05],
  [0.42, 0.91],
  [0.34, 0.73],
  [0.27, 0.55],
  [0.18, 0.36],
] as const;
const DANGER_SCALE = [
  [0.97, 0.09],
  [0.93, 0.19],
  [0.86, 0.39],
  [0.78, 0.64],
  [0.71, 0.86],
  [0.65, 1],
  [0.58, 0.94],
  [0.49, 0.82],
  [0.4, 0.64],
  [0.32, 0.47],
  [0.22, 0.34],
] as const;
const SUCCESS_SCALE = [
  [0.97, 0.13],
  [0.93, 0.28],
  [0.87, 0.49],
  [0.8, 0.75],
  [0.76, 0.88],
  [0.73, 1],
  [0.64, 0.93],
  [0.54, 0.77],
  [0.43, 0.62],
  [0.33, 0.46],
  [0.22, 0.31],
] as const;
const WARNING_SCALE = [
  [0.98, 0.16],
  [0.95, 0.35],
  [0.9, 0.57],
  [0.84, 0.79],
  [0.81, 0.91],
  [0.78, 1],
  [0.69, 0.95],
  [0.58, 0.82],
  [0.46, 0.63],
  [0.35, 0.47],
  [0.24, 0.35],
] as const;

function addScale(
  tokens: Record<string, string>,
  name: string,
  hue: number,
  chroma: number,
  profile: readonly (readonly [number, number])[],
) {
  profile.forEach(([lightness, chromaRatio], index) => {
    tokens[`--bambi-${name}-${SCALE_STEPS[index]}`] = fmt(
      lightness,
      chroma * chromaRatio,
      hue,
    );
  });
}

function generateColorTokens(hue: number, chroma: number, base: number) {
  const gc = 0.0015 + (base / 100) * (0.02 - 0.0015);
  const dHL = blendHue(hue, 25.74);
  const sH = blendHue(hue, 150.81),
    wHL = blendHue(hue, 72.33);
  const tokens: Record<string, string> = {};

  addScale(tokens, "neutral", hue, gc, NEUTRAL_SCALE);
  addScale(tokens, "primary", hue, chroma, PRIMARY_SCALE);
  addScale(tokens, "danger", dHL, 0.233, DANGER_SCALE);
  addScale(tokens, "success", sH, 0.194, SUCCESS_SCALE);
  addScale(tokens, "warning", wHL, 0.159, WARNING_SCALE);

  return tokens;
}

// ── Canvas setup ─────────────────────────────────────

const canvas = document.getElementById("canvas") as HTMLElement;
const transform = document.getElementById("canvas-transform") as HTMLElement;
const drawerRight = document.getElementById("drawer-right") as HTMLElement;
const drawerTitle = document.getElementById("drawer-title") as HTMLElement;
const tokenListEl = document.getElementById("token-list") as HTMLElement;

let offsetX = 0,
  offsetY = 0,
  scale = 1;
let isDragging = false,
  startX = 0,
  startY = 0,
  spaceDown = false;
let isAnimating = false;
let activeCard: string | null = null;

function getBoardColumnCount() {
  const cardCount = transform.querySelectorAll(".card").length;

  if (cardCount <= 1) return 1;
  if (cardCount <= 4) return 2;
  return 3;
}

function syncBoardLayout() {
  transform.style.setProperty(
    "--builder-card-columns",
    String(getBoardColumnCount()),
  );
}

// ── Generate Theme state ─────────────────────────────
let genHue = 271,
  genChroma = 0.22,
  genBase = 46;
let genTokens: Record<string, string> | null = null;

function applyGenTokens() {
  if (!genTokens) return;
  const root = document.documentElement;
  Object.entries(genTokens).forEach(([k, v]) => root.style.setProperty(k, v));
}

function regenerate() {
  genTokens = generateColorTokens(genHue, genChroma, genBase);
  applyGenTokens();
}

const MIN_SCALE = 0.1,
  MAX_SCALE = 4,
  GRID_SIZE = 16;
const DRAWER_LEFT_W = 220,
  DRAWER_RIGHT_W = 280;

type TokenItem = string | { name: string; selector: string };

const CARD_TOKENS: Record<string, { label: string; tokens: TokenItem[] }[]> = {
  colors: [
    {
      label: "Primary Scale",
      tokens: SCALE_STEPS.map((step) => `--bambi-primary-${step}`),
    },
    {
      label: "Neutral Scale",
      tokens: SCALE_STEPS.map((step) => `--bambi-neutral-${step}`),
    },
    {
      label: "Danger Scale",
      tokens: SCALE_STEPS.map((step) => `--bambi-danger-${step}`),
    },
    {
      label: "Success Scale",
      tokens: SCALE_STEPS.map((step) => `--bambi-success-${step}`),
    },
    {
      label: "Warning Scale",
      tokens: SCALE_STEPS.map((step) => `--bambi-warning-${step}`),
    },
    {
      label: "Base",
      tokens: [
        "--bambi-background",
        "--bambi-foreground",
        "--bambi-card",
        "--bambi-card-foreground",
        "--bambi-border",
        "--bambi-separator",
      ],
    },
    {
      label: "Brand",
      tokens: [
        "--bambi-primary",
        "--bambi-primary-foreground",
        "--bambi-secondary",
        "--bambi-secondary-foreground",
        "--bambi-accent",
        "--bambi-accent-foreground",
        "--bambi-muted",
        "--bambi-muted-foreground",
      ],
    },
    {
      label: "Semantic",
      tokens: [
        "--bambi-danger",
        "--bambi-danger-foreground",
        "--bambi-success",
        "--bambi-success-foreground",
        "--bambi-warning",
        "--bambi-warning-foreground",
        "--bambi-ring",
      ],
    },
    {
      label: "Input",
      tokens: [
        "--bambi-input",
        "--bambi-input-background",
        "--bambi-input-foreground",
        "--bambi-input-placeholder",
      ],
    },
  ],
  typography: [
    {
      label: "Font Family",
      tokens: ["--bambi-font-sans", "--bambi-font-mono"],
    },
    {
      label: "Font Size",
      tokens: [
        "--bambi-text-xs",
        "--bambi-text-sm",
        "--bambi-text-base",
        "--bambi-text-lg",
      ],
    },
    {
      label: "Font Weight",
      tokens: [
        "--bambi-font-weight-normal",
        "--bambi-font-weight-medium",
        "--bambi-font-weight-semibold",
        "--bambi-font-weight-bold",
      ],
    },
    {
      label: "Radius",
      tokens: [
        "--bambi-radius-sm",
        "--bambi-radius-md",
        "--bambi-radius-lg",
        "--bambi-radius-xl",
        "--bambi-radius-full",
      ],
    },
    {
      label: "Shadow",
      tokens: ["--bambi-shadow-sm", "--bambi-shadow-md", "--bambi-shadow-lg"],
    },
  ],
  buttons: [
    {
      label: "Component Layout",
      tokens: [
        { name: "--bambi-button-gap", selector: ".bambi-button" },
        { name: "--bambi-button-border-width", selector: ".bambi-button" },
        { name: "--bambi-button-line-height", selector: ".bambi-button" },
      ],
    },
    {
      label: "Component Padding",
      tokens: [
        { name: "--bambi-button-padding-sm", selector: ".bambi-button" },
        { name: "--bambi-button-padding-md", selector: ".bambi-button" },
        { name: "--bambi-button-padding-lg", selector: ".bambi-button" },
        { name: "--bambi-button-padding-icon", selector: ".bambi-button" },
      ],
    },
    {
      label: "Component Typography",
      tokens: [
        { name: "--bambi-button-font-size-sm", selector: ".bambi-button" },
        { name: "--bambi-button-font-size-md", selector: ".bambi-button" },
        { name: "--bambi-button-font-size-lg", selector: ".bambi-button" },
        { name: "--bambi-button-font-weight", selector: ".bambi-button" },
      ],
    },
    {
      label: "Component Shape",
      tokens: [
        { name: "--bambi-button-radius", selector: ".bambi-button" },
        "--bambi-state-hover-opacity",
        { name: "--bambi-button-disabled-opacity", selector: ".bambi-button" },
      ],
    },
    {
      label: "Component Focus",
      tokens: [
        {
          name: "--bambi-button-focus-ring-width",
          selector: ".bambi-button",
        },
        {
          name: "--bambi-button-focus-ring-offset",
          selector: ".bambi-button",
        },
        "--bambi-state-focus-ring",
      ],
    },
    {
      label: "Component Spinner",
      tokens: [
        {
          name: "--bambi-button-spinner-border-width",
          selector: ".bambi-button",
        },
        {
          name: "--bambi-button-spinner-duration",
          selector: ".bambi-button",
        },
      ],
    },
    {
      label: "Primary",
      tokens: ["--bambi-intent-primary-bg", "--bambi-intent-primary-fg"],
    },
    {
      label: "Secondary",
      tokens: [
        "--bambi-intent-secondary-bg",
        "--bambi-intent-secondary-fg",
        "--bambi-border",
      ],
    },
    {
      label: "Ghost",
      tokens: [
        "--bambi-foreground",
        "--bambi-accent",
        "--bambi-accent-foreground",
      ],
    },
    { label: "Outline", tokens: ["--bambi-primary", "--bambi-accent"] },
    {
      label: "Link",
      tokens: [
        "--bambi-primary",
        {
          name: "--bambi-button-link-underline-offset",
          selector: ".bambi-button",
        },
      ],
    },
    {
      label: "Danger",
      tokens: ["--bambi-intent-danger-bg", "--bambi-intent-danger-fg"],
    },
    {
      label: "Success",
      tokens: ["--bambi-intent-success-bg", "--bambi-intent-success-fg"],
    },
    {
      label: "Warning",
      tokens: ["--bambi-intent-warning-bg", "--bambi-intent-warning-fg"],
    },
  ],
};

const COLOR_HINTS = [
  "-bg",
  "-foreground",
  "-color",
  "-border",
  "-ring",
  "-separator",
  "background",
  "primary",
  "secondary",
  "danger",
  "success",
  "warning",
  "muted",
  "accent",
  "input",
  "popover",
  "card",
];

function isColorToken(name: string): boolean {
  return COLOR_HINTS.some((h) => name.includes(h));
}

// ── Canvas transform ────────────────────────────────

function applyTransform(animated = false) {
  if (animated) {
    if (!isAnimating) {
      isAnimating = true;
      transform.style.transition =
        "transform 0.48s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      transform.addEventListener(
        "transitionend",
        () => {
          transform.style.transition = "";
          isAnimating = false;
        },
        { once: true },
      );
    }
  } else {
    if (isAnimating) {
      transform.style.transition = "";
      isAnimating = false;
    }
  }
  transform.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  let step = GRID_SIZE;
  while (step * scale < 12) step *= 2;
  const bgSize = step * scale;
  canvas.style.backgroundSize = `${bgSize}px ${bgSize}px`;
  canvas.style.backgroundPosition = `${offsetX % bgSize}px ${offsetY % bgSize}px`;
}

function zoomAt(mouseX: number, mouseY: number, factor: number) {
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
  const ratio = newScale / scale;
  offsetX = mouseX - (mouseX - offsetX) * ratio;
  offsetY = mouseY - (mouseY - offsetY) * ratio;
  scale = newScale;
  applyTransform();
}

// ── Navigation ──────────────────────────────────────

function flyToCard(cardId: string, animated = true, rightOpen = false) {
  const cardEl = document.getElementById(`card-${cardId}`);
  if (!cardEl) return;

  const left = cardEl.offsetLeft;
  const top = cardEl.offsetTop;
  const width = cardEl.offsetWidth;

  scale = 1;

  const rightW =
    rightOpen || drawerRight.classList.contains("open") ? DRAWER_RIGHT_W : 0;
  const availW = window.innerWidth - DRAWER_LEFT_W - rightW;
  const screenCx = DRAWER_LEFT_W + availW / 2;

  offsetX = screenCx - (left + width / 2) * scale;
  offsetY = 60 - top * scale;
  applyTransform(animated);
}

// ── Token editor ────────────────────────────────────

const HUE_GRADIENT =
  "linear-gradient(to right," +
  [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
    .map((h) => `oklch(65% 0.22 ${h})`)
    .join(",") +
  ")";

function buildGenPanel(): HTMLElement {
  const root = document.documentElement;
  const isDark =
    root.getAttribute("data-theme") === "dark" ||
    root.classList.contains("dark");

  const section = document.createElement("div");
  section.className = "gen-section";

  const row1 = document.createElement("div");
  row1.className = "gen-row";

  const hueField = document.createElement("div");
  hueField.className = "gen-field";
  const hueLabel = document.createElement("div");
  hueLabel.className = "gen-label";
  const hueLabelText = document.createElement("span");
  hueLabelText.textContent = "Primary Color";
  const hueVal = document.createElement("span");
  hueVal.className = "gen-value";
  hueVal.textContent = `${genHue}°`;
  hueLabel.appendChild(hueLabelText);
  hueLabel.appendChild(hueVal);
  const hueWrap = document.createElement("div");
  hueWrap.className = "gen-slider-wrap";
  hueWrap.style.background = HUE_GRADIENT;
  const hueInput = document.createElement("input");
  hueInput.type = "range";
  hueInput.min = "0";
  hueInput.max = "360";
  hueInput.value = String(genHue);
  hueWrap.appendChild(hueInput);
  hueField.appendChild(hueLabel);
  hueField.appendChild(hueWrap);

  const hexField = document.createElement("div");
  hexField.className = "gen-field";
  hexField.style.flex = "0 0 auto";
  const hexLabel = document.createElement("div");
  hexLabel.className = "gen-label";
  hexLabel.textContent = "Hex";
  const hexWrap = document.createElement("div");
  hexWrap.className = "gen-hex-wrap";
  const hexSwatch = document.createElement("div");
  hexSwatch.className = "gen-hex-swatch";
  hexSwatch.style.background = oklchToHex(0.55, genChroma, genHue);
  const hexInput = document.createElement("input");
  hexInput.type = "text";
  hexInput.className = "gen-hex-input";
  hexInput.value = oklchToHex(0.55, genChroma, genHue);
  hexInput.maxLength = 7;
  hexInput.spellcheck = false;
  hexWrap.appendChild(hexSwatch);
  hexWrap.appendChild(hexInput);
  hexField.appendChild(hexLabel);
  hexField.appendChild(hexWrap);

  row1.appendChild(hueField);
  row1.appendChild(hexField);

  const row2 = document.createElement("div");
  row2.className = "gen-row";
  const baseField = document.createElement("div");
  baseField.className = "gen-field";
  const baseLabel = document.createElement("div");
  baseLabel.className = "gen-label";
  const baseLabelText = document.createElement("span");
  baseLabelText.textContent = "Base";
  const baseVal = document.createElement("span");
  baseVal.className = "gen-value";
  baseVal.textContent = String(genBase);
  baseLabel.appendChild(baseLabelText);
  baseLabel.appendChild(baseVal);
  const baseWrap = document.createElement("div");
  baseWrap.className = "gen-base-wrap";
  baseWrap.style.background = isDark
    ? `linear-gradient(to right,oklch(12% 0.0015 ${genHue}),oklch(12% 0.02 ${genHue}))`
    : `linear-gradient(to right,oklch(97% 0.0015 ${genHue}),oklch(97% 0.02 ${genHue}))`;
  const baseInput = document.createElement("input");
  baseInput.type = "range";
  baseInput.min = "0";
  baseInput.max = "100";
  baseInput.value = String(genBase);
  baseWrap.appendChild(baseInput);
  baseField.appendChild(baseLabel);
  baseField.appendChild(baseWrap);
  row2.appendChild(baseField);

  section.appendChild(row1);
  section.appendChild(row2);

  hueInput.addEventListener("input", () => {
    genHue = +hueInput.value;
    hueVal.textContent = `${genHue}°`;
    const hex = oklchToHex(0.55, genChroma, genHue);
    hexSwatch.style.background = hex;
    hexInput.value = hex;
    regenerate();
  });

  hexInput.addEventListener("input", () => {
    const raw = hexInput.value.startsWith("#")
      ? hexInput.value
      : `#${hexInput.value}`;
    const parsed = hexToOklch(raw);
    if (parsed && parsed.chroma > 0.01) {
      genHue = Math.round(parsed.hue);
      genChroma = +parsed.chroma.toFixed(3);
      hueInput.value = String(genHue);
      hueVal.textContent = `${genHue}°`;
      hexSwatch.style.background = hexInput.value;
      regenerate();
    }
  });

  baseInput.addEventListener("input", () => {
    genBase = +baseInput.value;
    baseVal.textContent = String(genBase);
    regenerate();
  });

  return section;
}

const scopedOverrideEl = document.createElement("style");
scopedOverrideEl.id = "bambi-builder-scoped-token-overrides";
document.head.appendChild(scopedOverrideEl);

const scopedOverrides = new Map<string, Map<string, string>>();

function getTokenName(item: TokenItem): string {
  return typeof item === "string" ? item : item.name;
}

function getTokenSelector(item: TokenItem): string | null {
  return typeof item === "string" ? null : item.selector;
}

function getTokenTarget(item: TokenItem): Element {
  const selector = getTokenSelector(item);

  if (!selector) return document.documentElement;

  return document.querySelector(selector) ?? document.documentElement;
}

function setScopedToken(selector: string, tokenName: string, value: string) {
  const selectorOverrides = scopedOverrides.get(selector) ?? new Map();
  selectorOverrides.set(tokenName, value);
  scopedOverrides.set(selector, selectorOverrides);
  syncScopedOverrides();
}

function removeScopedToken(selector: string, tokenName: string) {
  const selectorOverrides = scopedOverrides.get(selector);

  if (!selectorOverrides) return;

  selectorOverrides.delete(tokenName);
  if (selectorOverrides.size === 0) scopedOverrides.delete(selector);
  syncScopedOverrides();
}

function syncScopedOverrides() {
  scopedOverrideEl.textContent = [...scopedOverrides.entries()]
    .map(([selector, tokens]) => {
      const declarations = [...tokens.entries()]
        .map(([name, value]) => `  ${name}: ${value};`)
        .join("\n");

      return `${selector} {\n${declarations}\n}`;
    })
    .join("\n\n");
}

function renderTokenList(cardId: string) {
  const groups = CARD_TOKENS[cardId];
  if (!groups) return;
  tokenListEl.innerHTML = "";
  if (cardId === "colors") tokenListEl.appendChild(buildGenPanel());

  for (const group of groups) {
    const groupEl = document.createElement("div");
    groupEl.className = "token-group";

    const labelEl = document.createElement("div");
    labelEl.className = "token-group-label";
    labelEl.textContent = group.label;
    groupEl.appendChild(labelEl);

    for (const token of group.tokens) {
      const tokenName = getTokenName(token);
      const selector = getTokenSelector(token);
      const target = getTokenTarget(token);
      const targetStyle = getComputedStyle(target);
      const rawValue = targetStyle.getPropertyValue(tokenName).trim();
      const varMatch = rawValue.match(/^var\((--[^)]+)\)$/);
      const isInherited = !!varMatch;
      const inheritedFrom = varMatch ? varMatch[1] : null;

      const row = document.createElement("div");
      row.className = "token-row" + (isInherited ? " inherited" : "");

      const nameEl = document.createElement("div");
      nameEl.className = "token-name";
      nameEl.textContent = tokenName;

      const wrap = document.createElement("div");
      wrap.className = "token-input-wrap";

      if (isColorToken(tokenName)) {
        const swatch = document.createElement("div");
        swatch.className = "token-color-swatch";
        swatch.style.setProperty("background-color", `var(${tokenName})`);
        wrap.appendChild(swatch);
      }

      const input = document.createElement("input");
      input.className = "token-input";
      input.value = rawValue;
      input.disabled = isInherited;
      input.addEventListener("input", () => {
        if (selector) {
          setScopedToken(selector, tokenName, input.value);
        } else {
          document.documentElement.style.setProperty(tokenName, input.value);
        }
      });

      wrap.appendChild(input);
      row.appendChild(nameEl);
      row.appendChild(wrap);

      if (isInherited && inheritedFrom) {
        let overriding = false;
        const btn = document.createElement("button");
        btn.className = "token-override-btn";
        btn.textContent = "Override";

        btn.addEventListener("click", () => {
          overriding = !overriding;
          if (overriding) {
            const resolved = targetStyle.getPropertyValue(inheritedFrom).trim();
            input.value = resolved || rawValue;
            input.disabled = false;
            if (selector) {
              setScopedToken(selector, tokenName, input.value);
            } else {
              document.documentElement.style.setProperty(tokenName, input.value);
            }
            btn.textContent = "Reset";
            btn.classList.add("active");
            row.classList.remove("inherited");
            input.focus();
          } else {
            if (selector) {
              removeScopedToken(selector, tokenName);
            } else {
              document.documentElement.style.removeProperty(tokenName);
            }
            input.disabled = true;
            input.value = rawValue;
            btn.textContent = "Override";
            btn.classList.remove("active");
            row.classList.add("inherited");
          }
        });

        wrap.appendChild(btn);
      }

      groupEl.appendChild(row);
    }

    tokenListEl.appendChild(groupEl);
  }
}

function openTokenEditor(cardId: string) {
  const titles: Record<string, string> = {
    colors: "Color Tokens",
    typography: "Typography Tokens",
    buttons: "Button Tokens",
  };
  drawerTitle.textContent = titles[cardId] ?? "Tokens";
  renderTokenList(cardId);
  drawerRight.classList.add("open");
}

function selectCard(cardId: string) {
  activeCard = cardId;
  document.querySelectorAll<HTMLElement>(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.card === cardId);
  });
  openTokenEditor(cardId);
  requestAnimationFrame(() => flyToCard(cardId, true, true));
}

// ── Event wiring ────────────────────────────────────

document.querySelectorAll<HTMLElement>(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cardId = btn.dataset.card;
    if (cardId) selectCard(cardId);
  });
});

document.querySelectorAll<HTMLElement>("[data-edit-card]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cardId = btn.dataset.editCard;
    if (cardId) {
      activeCard = cardId;
      document.querySelectorAll<HTMLElement>(".nav-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.card === cardId);
      });
      openTokenEditor(cardId);
    }
  });
});

document.getElementById("drawer-close")!.addEventListener("click", () => {
  drawerRight.classList.remove("open");
  activeCard = null;
  document
    .querySelectorAll<HTMLElement>(".nav-item")
    .forEach((el) => el.classList.remove("active"));
});

// ── Pan ─────────────────────────────────────────────

canvas.addEventListener("mousedown", (e) => {
  const onCanvas = e.target === canvas || e.target === transform;
  if (e.button === 1 || (e.button === 0 && (spaceDown || onCanvas))) {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    canvas.classList.add("panning");
    e.preventDefault();
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  offsetX = e.clientX - startX;
  offsetY = e.clientY - startY;
  applyTransform();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  canvas.classList.remove("panning");
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat) {
    spaceDown = true;
    canvas.style.cursor = "grab";
    e.preventDefault();
  }
  if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
    zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2);
    e.preventDefault();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "-") {
    zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.2);
    e.preventDefault();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "0") {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    applyTransform();
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spaceDown = false;
    canvas.style.cursor = "grab";
  }
});

window.addEventListener("resize", () => {
  syncBoardLayout();

  if (activeCard) {
    flyToCard(activeCard, false, drawerRight.classList.contains("open"));
  }
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1);
    } else {
      offsetX -= e.deltaX;
      offsetY -= e.deltaY;
      applyTransform();
    }
  },
  { passive: false },
);

// ── Theme switch ────────────────────────────────────

const html = document.documentElement;

function applyTheme(dark: boolean) {
  if (dark) {
    html.setAttribute("data-theme", "dark");
    html.classList.add("dark");
  } else {
    html.setAttribute("data-theme", "light");
    html.classList.remove("dark");
  }
}

function syncThemeBtns() {
  const isDark = html.getAttribute("data-theme") === "dark";
  document.querySelectorAll<HTMLElement>(".theme-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.themeVal === (isDark ? "dark" : "light"),
    );
  });
}

const stored = localStorage.getItem("starlight-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(stored === "dark" || (!stored && prefersDark));
syncThemeBtns();

document.querySelectorAll<HTMLElement>(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const dark = btn.dataset.themeVal === "dark";
    applyTheme(dark);
    localStorage.setItem("starlight-theme", dark ? "dark" : "light");
    syncThemeBtns();
    applyGenTokens();
    if (activeCard && drawerRight.classList.contains("open")) {
      renderTokenList(activeCard);
    }
  });
});

window.addEventListener("storage", (e) => {
  if (e.key !== "starlight-theme") return;
  applyTheme(e.newValue === "dark");
  syncThemeBtns();
  applyGenTokens();
});

syncBoardLayout();
flyToCard("colors", false);
