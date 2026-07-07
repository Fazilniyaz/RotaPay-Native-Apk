// lib/runtimeConfig.ts
// ─────────────────────────────────────────────
// Runtime configuration fetched from the backend AFTER authentication
// (blueprint point 3). Keeps non-secret, tunable settings out of the binary so
// they can change without a new release, and gives us the channel to deliver any
// future sensitive config per-request to a verified client rather than hardcode
// it. No secrets are ever hardcoded in the app.
// ─────────────────────────────────────────────

import api from './api';

export interface RuntimeConfig {
  attestation: { enforced: boolean };
  features: Record<string, unknown>;
}

let cached: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig | null {
  return cached;
}

// Fetch + cache the runtime config. Best-effort — a failure leaves the last known
// (or null) config and never blocks the app.
export async function loadRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const res = await api.get('/config');
    cached = res.data.data as RuntimeConfig;
  } catch {
    /* keep the previous value */
  }
  return cached;
}

export function clearRuntimeConfig(): void {
  cached = null;
}
