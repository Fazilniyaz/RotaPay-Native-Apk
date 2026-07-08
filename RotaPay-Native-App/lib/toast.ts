import { Alert, Platform } from 'react-native';

// Cross-platform action feedback.
//
// React Native's `Alert` is a no-op on react-native-web, which is why action
// results (e.g. "This time overlaps a shift you already have today") never
// appeared when running the app in the browser. Rather than a separate `.web`
// file (which an already-running Metro bundler won't pick up until restart), we
// branch at runtime here so both platforms work from one module:
//   • native → the OS Alert (reliable, renders above modals)
//   • web    → a lightweight toast injected into document.body at max z-index,
//              so it sits above the app's modals (which fire save errors while open)

export type ToastType = 'error' | 'success' | 'info';

// ── Web toast ──────────────────────────────────────────────────────────────

const ACCENT: Record<ToastType, string> = {
  error: '#ba1a1a',
  success: '#001b48',
  info: '#02457a',
};

// Inline SVG icons ({c} is swapped for the accent colour) — no asset/font deps.
const ICON: Record<ToastType, string> = {
  error:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  success:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>',
  info:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

function inferType(title: string): ToastType {
  const t = title.toLowerCase();
  if (/error|fail|invalid|required|needed|missing|denied|limit|expired|permission|overlap|conflict/.test(t)) return 'error';
  if (/saved|success|clocked|sent|created|updated|deleted|done|added/.test(t)) return 'success';
  return 'info';
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]));

let container: HTMLDivElement | null = null;
function getContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.style.cssText =
      'position:fixed;top:16px;left:0;right:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;padding:0 16px;';
    document.body.appendChild(container);
  }
  return container;
}

function showWeb(title: string, message?: string, type?: ToastType): void {
  const c = getContainer();
  if (!c) return;
  const t = type ?? inferType(title);
  const color = ACCENT[t];

  const el = document.createElement('div');
  el.style.cssText =
    `pointer-events:auto;cursor:pointer;box-sizing:border-box;width:100%;max-width:420px;display:flex;gap:11px;align-items:flex-start;` +
    `background:#ffffff;border:1px solid rgba(2,69,122,0.08);border-left:4px solid ${color};border-radius:10px;padding:13px 14px;` +
    `box-shadow:0 10px 28px rgba(0,0,0,0.16);font-family:'Montserrat_500Medium',system-ui,-apple-system,sans-serif;` +
    `transform:translateY(-12px);opacity:0;transition:transform .22s ease,opacity .22s ease;`;

  el.innerHTML =
    `<span style="flex-shrink:0;line-height:0;margin-top:1px;">${ICON[t].replace('{c}', color)}</span>` +
    `<div style="min-width:0;flex:1;">` +
    `<div style="font-family:'Montserrat_700Bold',system-ui,sans-serif;font-weight:700;font-size:13px;color:#1b1c1c;">${escapeHtml(title)}</div>` +
    (message ? `<div style="font-size:12px;line-height:17px;color:#404752;margin-top:2px;">${escapeHtml(message)}</div>` : '') +
    `</div>`;

  c.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  });

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    el.style.transform = 'translateY(-12px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  };
  el.addEventListener('click', remove);
  setTimeout(remove, t === 'error' ? 5000 : 3600);
}

// ── Public API ─────────────────────────────────────────────────────────────

function show(title: string, message?: string, type?: ToastType): void {
  if (Platform.OS === 'web') {
    showWeb(title, message, type);
  } else {
    Alert.alert(title, message);
  }
}

type NotifyFn = {
  (title: string, message?: string, type?: ToastType): void;
  error: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

export const notify: NotifyFn = Object.assign(show, {
  error: (title: string, message?: string) => show(title, message, 'error'),
  success: (title: string, message?: string) => show(title, message, 'success'),
  info: (title: string, message?: string) => show(title, message, 'info'),
});
