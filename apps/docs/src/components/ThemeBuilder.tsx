/** @jsxImportSource react */
import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { Button } from '@bambi-react/button';

// ── Color math ─────────────────────────────────────────────────────────────

function toLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function toGamma(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function hexToOklch(hex: string): { hue: number; chroma: number } | null {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = toLinear(parseInt(clean.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(clean.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(clean.slice(4, 6), 16) / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a  =  1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bv =  0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  return {
    chroma: Math.sqrt(a * a + bv * bv),
    hue: ((Math.atan2(bv, a) * 180) / Math.PI + 360) % 360,
  };
}

function oklchToHex(L: number, C: number, H: number): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const rl = Math.max(0, Math.min(1,  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s));
  const gl = Math.max(0, Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s));
  const bl = Math.max(0, Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s));
  const rv = Math.round(toGamma(rl) * 255);
  const gv = Math.round(toGamma(gl) * 255);
  const bv = Math.round(toGamma(bl) * 255);
  return `#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

function oklchToLinearRGB(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function relativeLuminance(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinearRGB(L, C, H).map(v => Math.max(0, Math.min(1, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function bestForeground(bgL: number, bgC: number, bgH: number): string {
  const bgLum  = relativeLuminance(bgL, bgC, bgH);
  const wLum   = relativeLuminance(0.98, 0, 0);
  const hiW    = Math.max(bgLum, wLum);
  const loW    = Math.min(bgLum, wLum);
  return (hiW + 0.05) / (loW + 0.05) >= 4.5 ? 'oklch(98% 0 0)' : 'oklch(9% 0 0)';
}

// ── Status hue selection ────────────────────────────────────────────────────

function blendSemanticHue(primaryHue: number, defaultHue: number): number {
  const DEFAULT_ACCENT_HUE = 253.83;
  const SEMANTIC_HUE_BLEND_FACTOR = 0.12;
  const blended = defaultHue + (primaryHue - DEFAULT_ACCENT_HUE) * SEMANTIC_HUE_BLEND_FACTOR;
  return ((blended % 360) + 360) % 360;
}

const MIN_GRAY_CHROMA = 0.0015;
const MAX_GRAY_CHROMA = 0.02;

function grayChromaFromBase(base: number): number {
  return MIN_GRAY_CHROMA + (base / 100) * (MAX_GRAY_CHROMA - MIN_GRAY_CHROMA);
}

// ── Token generation ────────────────────────────────────────────────────────

type RadiusKey = 'none' | 'sm' | 'md' | 'lg' | 'full';

const RADIUS_PRESETS: Record<RadiusKey, Record<string, string>> = {
  none: { sm: '0',        md: '0',        lg: '0',        xl: '0',       full: '9999px' },
  sm:   { sm: '0.125rem', md: '0.25rem',  lg: '0.375rem', xl: '0.5rem',  full: '9999px' },
  md:   { sm: '0.25rem',  md: '0.375rem', lg: '0.5rem',   xl: '0.75rem', full: '9999px' },
  lg:   { sm: '0.375rem', md: '0.5rem',   lg: '0.75rem',  xl: '1rem',    full: '9999px' },
  full: { sm: '9999px',   md: '9999px',   lg: '9999px',   xl: '9999px',  full: '9999px' },
};

function fmt(L: number, C: number, H: number): string {
  return `oklch(${Math.round(L * 100)}% ${C.toFixed(3)} ${Math.round(H)})`;
}

interface ThemeTokens {
  light: Record<string, string>;
  dark:  Record<string, string>;
  radius: Record<string, string>;
}

function generateTokens(hue: number, chroma: number, base: number, radius: RadiusKey): ThemeTokens {
  const r          = RADIUS_PRESETS[radius];
  const grayChroma = grayChromaFromBase(base);

  // primary
  const lightPrimary   = fmt(0.55, chroma, hue);
  const lightPrimaryFg = bestForeground(0.55, chroma, hue);
  const lightBg        = fmt(0.97, grayChroma, hue);

  const darkPrimary    = fmt(0.65, chroma, hue);
  const darkPrimaryFg  = bestForeground(0.65, chroma, hue);
  const darkBg         = fmt(0.12, grayChroma, hue);

  // status — keep semantic identity, but blend slightly toward the base hue like HeroUI
  const dHL = blendSemanticHue(hue, 25.74);
  const dHD = blendSemanticHue(hue, 24.63);
  const sH  = blendSemanticHue(hue, 150.81);
  const wHL = blendSemanticHue(hue, 72.33);
  const wHD = blendSemanticHue(hue, 76.34);

  const lightDestructive   = fmt(0.6532, 0.2328, dHL);
  const lightDestructiveFg = bestForeground(0.6532, 0.2328, dHL);
  const lightSuccess       = fmt(0.7329, 0.1935, sH);
  const lightSuccessFg     = bestForeground(0.7329, 0.1935, sH);
  const lightWarning       = fmt(0.7819, 0.1585, wHL);
  const lightWarningFg     = bestForeground(0.7819, 0.1585, wHL);

  const darkDestructive   = fmt(0.5940, 0.1967, dHD);
  const darkDestructiveFg = bestForeground(0.5940, 0.1967, dHD);
  const darkSuccess       = fmt(0.7329, 0.1935, sH);
  const darkSuccessFg     = bestForeground(0.7329, 0.1935, sH);
  const darkWarning       = fmt(0.8203, 0.1388, wHD);
  const darkWarningFg     = bestForeground(0.8203, 0.1388, wHD);

  const light: Record<string, string> = {
    // surface
    '--bambi-background':           lightBg,
    '--bambi-foreground':           'oklch(9% 0 0)',
    '--bambi-card':                 fmt(1.00, grayChroma * 0.5, hue),
    '--bambi-card-foreground':      'oklch(9% 0 0)',
    '--bambi-popover':              fmt(1.00, grayChroma * 0.5, hue),
    '--bambi-popover-foreground':   'oklch(9% 0 0)',
    // brand
    '--bambi-primary':              lightPrimary,
    '--bambi-primary-foreground':   lightPrimaryFg,
    // neutral surfaces
    '--bambi-secondary':            fmt(0.9524, grayChroma * 0.8, hue),
    '--bambi-secondary-foreground': 'oklch(9% 0 0)',
    '--bambi-accent':               fmt(0.9373, grayChroma * 0.8, hue),
    '--bambi-accent-foreground':    'oklch(9% 0 0)',
    '--bambi-muted':                fmt(0.9373, grayChroma * 0.8, hue),
    '--bambi-muted-foreground':     fmt(0.5517, Math.min(grayChroma * 2, 0.03), hue),
    // status
    '--bambi-destructive':              lightDestructive,
    '--bambi-destructive-foreground':   lightDestructiveFg,
    '--bambi-success':                  lightSuccess,
    '--bambi-success-foreground':       lightSuccessFg,
    '--bambi-warning':                  lightWarning,
    '--bambi-warning-foreground':       lightWarningFg,
    // ui elements
    '--bambi-border':               fmt(0.90, grayChroma, hue),
    '--bambi-input':                fmt(0.90, grayChroma, hue),
    '--bambi-input-background':     fmt(1.00, grayChroma * 0.5, hue),
    '--bambi-input-foreground':     'oklch(9% 0 0)',
    '--bambi-input-placeholder':    fmt(0.5517, Math.min(grayChroma * 2, 0.03), hue),
    '--bambi-ring':                 lightPrimary,
    '--bambi-separator':            fmt(0.92, grayChroma, hue),
    // button tokens — bypass var() chain for preview
    '--bambi-button-primary-bg':             lightPrimary,
    '--bambi-button-primary-foreground':     lightPrimaryFg,
    '--bambi-button-outline-color':          lightPrimary,
    '--bambi-button-outline-border':         lightPrimary,
    '--bambi-button-link-color':             lightPrimary,
    '--bambi-button-ring':                   lightPrimary,
    '--bambi-button-secondary-bg':           fmt(0.9524, grayChroma * 0.8, hue),
    '--bambi-button-secondary-foreground':   'oklch(9% 0 0)',
    '--bambi-button-secondary-border':       fmt(0.90, grayChroma, hue),
    '--bambi-button-ghost-color':            'oklch(9% 0 0)',
    '--bambi-button-ghost-hover-bg':         fmt(0.9373, grayChroma * 0.8, hue),
    '--bambi-button-ghost-hover-color':      'oklch(9% 0 0)',
    '--bambi-button-destructive-bg':         lightDestructive,
    '--bambi-button-destructive-foreground': lightDestructiveFg,
    '--bambi-button-success-bg':             lightSuccess,
    '--bambi-button-success-foreground':     lightSuccessFg,
    '--bambi-button-warning-bg':             lightWarning,
    '--bambi-button-warning-foreground':     lightWarningFg,
  };

  const dark: Record<string, string> = {
    // surface
    '--bambi-background':           darkBg,
    '--bambi-foreground':           'oklch(98% 0 0)',
    '--bambi-card':                 fmt(0.2103, grayChroma * 2, hue),
    '--bambi-card-foreground':      'oklch(98% 0 0)',
    '--bambi-popover':              fmt(0.2103, grayChroma * 2, hue),
    '--bambi-popover-foreground':   'oklch(98% 0 0)',
    // brand
    '--bambi-primary':              darkPrimary,
    '--bambi-primary-foreground':   darkPrimaryFg,
    // neutral surfaces
    '--bambi-secondary':            fmt(0.2570, grayChroma * 1.5, hue),
    '--bambi-secondary-foreground': 'oklch(98% 0 0)',
    '--bambi-accent':               fmt(0.2721, grayChroma * 1.5, hue),
    '--bambi-accent-foreground':    'oklch(98% 0 0)',
    '--bambi-muted':                fmt(0.2740, grayChroma, hue),
    '--bambi-muted-foreground':     fmt(0.7050, Math.min(grayChroma * 2, 0.03), hue),
    // status
    '--bambi-destructive':              darkDestructive,
    '--bambi-destructive-foreground':   darkDestructiveFg,
    '--bambi-success':                  darkSuccess,
    '--bambi-success-foreground':       darkSuccessFg,
    '--bambi-warning':                  darkWarning,
    '--bambi-warning-foreground':       darkWarningFg,
    // ui elements
    '--bambi-border':               fmt(0.28, grayChroma, hue),
    '--bambi-input':                fmt(0.28, grayChroma, hue),
    '--bambi-input-background':     fmt(0.2103, grayChroma * 2, hue),
    '--bambi-input-foreground':     'oklch(98% 0 0)',
    '--bambi-input-placeholder':    fmt(0.7050, Math.min(grayChroma * 2, 0.03), hue),
    '--bambi-ring':                 darkPrimary,
    '--bambi-separator':            fmt(0.25, grayChroma, hue),
    // button tokens — bypass var() chain for preview
    '--bambi-button-primary-bg':             darkPrimary,
    '--bambi-button-primary-foreground':     darkPrimaryFg,
    '--bambi-button-outline-color':          darkPrimary,
    '--bambi-button-outline-border':         darkPrimary,
    '--bambi-button-link-color':             darkPrimary,
    '--bambi-button-ring':                   darkPrimary,
    '--bambi-button-secondary-bg':           fmt(0.2570, grayChroma * 1.5, hue),
    '--bambi-button-secondary-foreground':   'oklch(98% 0 0)',
    '--bambi-button-secondary-border':       fmt(0.28, grayChroma, hue),
    '--bambi-button-ghost-color':            'oklch(98% 0 0)',
    '--bambi-button-ghost-hover-bg':         fmt(0.2721, grayChroma * 1.5, hue),
    '--bambi-button-ghost-hover-color':      'oklch(98% 0 0)',
    '--bambi-button-destructive-bg':         darkDestructive,
    '--bambi-button-destructive-foreground': darkDestructiveFg,
    '--bambi-button-success-bg':             darkSuccess,
    '--bambi-button-success-foreground':     darkSuccessFg,
    '--bambi-button-warning-bg':             darkWarning,
    '--bambi-button-warning-foreground':     darkWarningFg,
  };

  const radiusTokens: Record<string, string> = {
    '--bambi-radius-sm':     r.sm,
    '--bambi-radius-md':     r.md,
    '--bambi-radius-lg':     r.lg,
    '--bambi-radius-xl':     r.xl,
    '--bambi-radius-full':   r.full,
    '--bambi-button-radius': r.md,
  };

  return { light, dark, radius: radiusTokens };
}

// Keys persisted to localStorage (semantic tokens only — button bypass tokens stay preview-only)
const SEMANTIC_COLOR_KEYS = new Set<string>([
  '--bambi-background', '--bambi-foreground',
  '--bambi-card', '--bambi-card-foreground',
  '--bambi-popover', '--bambi-popover-foreground',
  '--bambi-primary', '--bambi-primary-foreground',
  '--bambi-secondary', '--bambi-secondary-foreground',
  '--bambi-accent', '--bambi-accent-foreground',
  '--bambi-muted', '--bambi-muted-foreground',
  '--bambi-destructive', '--bambi-destructive-foreground',
  '--bambi-success', '--bambi-success-foreground',
  '--bambi-warning', '--bambi-warning-foreground',
  '--bambi-border', '--bambi-input',
  '--bambi-input-background', '--bambi-input-foreground', '--bambi-input-placeholder',
  '--bambi-ring', '--bambi-separator',
]);

function applyToDocRoot(
  light: Record<string, string>,
  dark: Record<string, string>,
  radius: Record<string, string>,
) {
  const root = document.documentElement;
  const t = root.dataset.theme || localStorage.getItem('starlight-theme');
  const isDark = t === 'dark' || (t !== 'light' && !window.matchMedia('(prefers-color-scheme: light)').matches);
  const active = isDark ? dark : light;
  Object.entries({ ...active, ...radius }).forEach(([k, v]) => root.style.setProperty(k, v));
  (window as any).__bambiTheme = { light, dark, radius };
}

const COLOR_KEYS_ORDERED = [
  '--bambi-background',       '--bambi-foreground',
  '--bambi-card',             '--bambi-card-foreground',
  '--bambi-popover',          '--bambi-popover-foreground',
  '--bambi-primary',          '--bambi-primary-foreground',
  '--bambi-secondary',        '--bambi-secondary-foreground',
  '--bambi-accent',           '--bambi-accent-foreground',
  '--bambi-muted',            '--bambi-muted-foreground',
  '--bambi-destructive',      '--bambi-destructive-foreground',
  '--bambi-success',          '--bambi-success-foreground',
  '--bambi-warning',          '--bambi-warning-foreground',
  '--bambi-border',           '--bambi-input',
  '--bambi-input-background', '--bambi-input-foreground', '--bambi-input-placeholder',
  '--bambi-ring',             '--bambi-separator',
] as const;

const RADIUS_KEYS_ORDERED = [
  '--bambi-radius-sm', '--bambi-radius-md', '--bambi-radius-lg',
  '--bambi-radius-xl', '--bambi-radius-full',
] as const;

function generateCSS(hue: number, chroma: number, base: number, radius: RadiusKey): string {
  const { light, dark, radius: r } = generateTokens(hue, chroma, base, radius);

  const toLines = (keys: readonly string[], obj: Record<string, string>) =>
    keys.map(k => `  ${k}: ${obj[k]};`).join('\n');

  const rootBlock =
    `  /* Theme Colors (Light Mode) */\n${toLines(COLOR_KEYS_ORDERED, light)}\n\n` +
    `  /* Border Radius */\n${toLines(RADIUS_KEYS_ORDERED, r)}`;

  const darkBlock =
    `  /* Theme Colors (Dark Mode) */\n${toLines(COLOR_KEYS_ORDERED, dark)}`;

  return `:root {\n${rootBlock}\n}\n\n.dark {\n${darkBlock}\n}`;
}

// ── Component ───────────────────────────────────────────────────────────────

const HUE_GRADIENT =
  'linear-gradient(to right,' +
  [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
    .map(h => `oklch(65% 0.22 ${h})`)
    .join(',') +
  ')';

const RADIUS_LABELS: { key: RadiusKey; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'sm',   label: 'SM'   },
  { key: 'md',   label: 'MD'   },
  { key: 'lg',   label: 'LG'   },
  { key: 'full', label: 'Full' },
];

const DEFAULT_HUE = 271;
const DEFAULT_CHROMA = 0.22;
const DEFAULT_BASE = 46;
const DEFAULT_RADIUS: RadiusKey = 'lg';

export default function ThemeBuilder() {
  const [hue,       setHue]      = useState(DEFAULT_HUE);
  const [chroma,    setChroma]   = useState(DEFAULT_CHROMA);
  const [base,      setBase]     = useState(DEFAULT_BASE);
  const [radius,    setRadius]   = useState<RadiusKey>(DEFAULT_RADIUS);
  const [siteTheme, setSiteTheme] = useState<'light' | 'dark'>('light');
  const [hexInput,  setHexInput] = useState(() => oklchToHex(0.55, DEFAULT_CHROMA, DEFAULT_HUE));
  const [copied,     setCopied]     = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const tokens    = useMemo(() => generateTokens(hue, chroma, base, radius), [hue, chroma, base, radius]);
  const cssOutput = useMemo(() => generateCSS(hue, chroma, base, radius),    [hue, chroma, base, radius]);

  // Mirror site's data-theme attribute so the preview always matches what the user sees
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setSiteTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Restore slider state from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bambi-theme-state');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.hue    === 'number') setHue(s.hue);
      if (typeof s.chroma === 'number') setChroma(s.chroma);
      if (typeof s.base   === 'number') setBase(s.base);
      if (typeof s.radius === 'string') setRadius(s.radius as RadiusKey);
      if (typeof s.hue === 'number' && typeof s.chroma === 'number')
        setHexInput(oklchToHex(0.55, s.chroma, s.hue));
      setHasApplied(true);
    } catch (e) {}
  }, []);

  // Save tokens to localStorage and apply to :root whenever tokens or site theme changes
  useEffect(() => {
    const filterSemantic = (obj: Record<string, string>) =>
      Object.fromEntries(Object.entries(obj).filter(([k]) => SEMANTIC_COLOR_KEYS.has(k)));
    const lightSemantic = filterSemantic(tokens.light);
    const darkSemantic  = filterSemantic(tokens.dark);
    try {
      localStorage.setItem('bambi-theme', JSON.stringify({
        light: lightSemantic, dark: darkSemantic, radius: tokens.radius,
      }));
      localStorage.setItem('bambi-theme-state', JSON.stringify({ hue, chroma, base, radius }));
      applyToDocRoot(lightSemantic, darkSemantic, tokens.radius);
      setHasApplied(true);
    } catch (e) {}
  }, [tokens, hue, chroma, base, radius, siteTheme]);

  const previewRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const active = siteTheme === 'dark' ? tokens.dark : tokens.light;
    const all = { ...active, ...tokens.radius };
    Object.entries(all).forEach(([k, v]) => el.style.setProperty(k, v));
    el.style.background   = active['--bambi-background'] ?? '';
    el.style.color        = active['--bambi-foreground'] ?? '';
    el.style.borderColor  = active['--bambi-border']     ?? '';
  }, [tokens, siteTheme]);

  // sync hex input when hue/chroma change via slider
  const syncHex = (h: number, c: number) => setHexInput(oklchToHex(0.55, c, h));

  const handleHueSlider = (v: number) => { setHue(v); syncHex(v, chroma); };

  const handleHexInput = (raw: string) => {
    setHexInput(raw);
    const parsed = hexToOklch(raw.startsWith('#') ? raw : `#${raw}`);
    if (parsed && parsed.chroma > 0.01) {
      setHue(Math.round(parsed.hue));
      setChroma(+parsed.chroma.toFixed(3));
    }
  };

  const handleReset = () => {
    localStorage.removeItem('bambi-theme');
    localStorage.removeItem('bambi-theme-state');
    const root = document.documentElement;
    [...COLOR_KEYS_ORDERED, ...RADIUS_KEYS_ORDERED, '--bambi-button-radius'].forEach(k =>
      root.style.removeProperty(k)
    );
    delete (window as any).__bambiTheme;
    setHue(DEFAULT_HUE);
    setChroma(DEFAULT_CHROMA);
    setBase(DEFAULT_BASE);
    setRadius(DEFAULT_RADIUS);
    setHexInput(oklchToHex(0.55, DEFAULT_CHROMA, DEFAULT_HUE));
    setHasApplied(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(cssOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const primaryColor = siteTheme === 'dark'
    ? tokens.dark['--bambi-primary']
    : tokens.light['--bambi-primary'];

  return (
    <div className="tb-root">

      {/* ── Controls ── */}
      <div className="tb-controls">

        {/* Row 1: color picker */}
        <div className="tb-control-row">
          <div className="tb-slider-group" style={{ flex: 1 }}>
            <div className="tb-slider-label">
              <span>Primary Color</span>
              <span className="tb-value">{hue}°</span>
            </div>
            <div className="tb-slider-wrap" style={{ background: HUE_GRADIENT }}>
              <input
                type="range" min={0} max={360} value={hue}
                onChange={e => handleHueSlider(+e.target.value)}
                className="tb-slider"
                aria-label="Primary hue"
              />
            </div>
          </div>

          <div className="tb-hex-group">
            <div className="tb-slider-label">
              <span>Hex</span>
            </div>
            <div className="tb-hex-wrap">
              <div className="tb-hex-swatch" style={{ background: primaryColor }} />
              <input
                type="text"
                className="tb-hex-input"
                value={hexInput}
                onChange={e => handleHexInput(e.target.value)}
                placeholder="#3b82f6"
                maxLength={7}
                spellCheck={false}
                aria-label="Hex color"
              />
            </div>
          </div>
        </div>

        {/* Row 2: base */}
        <div className="tb-control-row">
          <div className="tb-slider-group" style={{ flex: 1 }}>
            <div className="tb-slider-label">
              <span>Base</span>
              <span className="tb-value">{base}</span>
            </div>
            <div
              className="tb-slider-wrap"
              style={{
                background: siteTheme === 'dark'
                  ? `linear-gradient(to right, oklch(12% ${MIN_GRAY_CHROMA.toFixed(3)} ${hue}), oklch(12% ${MAX_GRAY_CHROMA.toFixed(3)} ${hue}))`
                  : `linear-gradient(to right, oklch(97% ${MIN_GRAY_CHROMA.toFixed(3)} ${hue}), oklch(97% ${MAX_GRAY_CHROMA.toFixed(3)} ${hue}))`,
              }}
            >
              <input
                type="range" min={0} max={100} value={base}
                onChange={e => setBase(+e.target.value)}
                className="tb-slider"
                aria-label="Background base"
              />
            </div>
          </div>
        </div>

        {/* Row 3: radius */}
        <div className="tb-control-row tb-control-row--inline">
          <div className="tb-btn-group">
            <span className="tb-group-label">Radius</span>
            {RADIUS_LABELS.map(({ key, label }) => (
              <button
                key={key}
                className={`tb-pill${radius === key ? ' tb-pill--active' : ''}`}
                onClick={() => setRadius(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Preview ── */}
      <div ref={previewRef} className="tb-preview">
        <div className="preview-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
        </div>
        <div className="preview-row">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </div>

      {/* ── CSS Output ── */}
      <div className="tb-output">
        <div className="tb-output-header">
          <span>Generated CSS</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {hasApplied && (
              <span className="tb-applied-badge">Applied to site</span>
            )}
            {hasApplied && (
              <button className="tb-copy-btn" onClick={handleReset}>Reset</button>
            )}
            <button className="tb-copy-btn" onClick={copy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <pre className="tb-output-pre">{cssOutput}</pre>
      </div>
    </div>
  );
}
