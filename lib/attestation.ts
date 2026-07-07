// lib/attestation.ts
// ─────────────────────────────────────────────
// App Attestation client (Zero-Trust, blueprint point 2).
//
// Proves to the backend that requests come from our GENUINE, unmodified app
// binary — not a script/bot — using Android Play Integrity / iOS App Attest.
// Flow (handshake, refreshed hourly):
//   1. GET a one-time challenge from the backend.
//   2. Ask the OS for an integrity token (Android) / attestation|assertion (iOS)
//      bound to that challenge.
//   3. POST it to the backend, which verifies it cryptographically and returns a
//      short-lived attestation token.
//   4. That token is attached as `X-Attestation-Token` on subsequent requests.
//
// The native attestation modules require a custom dev/production build (they do
// NOT exist in Expo Go). So the native provider is loaded OPTIONALLY: if it's not
// present, the handshake is skipped and the app still runs — the backend only
// ENFORCES attestation when ATTESTATION_ENFORCED=true, which you enable once the
// production builds ship with the provider wired.
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Storage } from './storage';

// ── Native provider seam ──────────────────────
// The real attestation modules (iOS App Attest / Android Play Integrity) exist
// ONLY in a custom dev/production build, not in Expo Go. Metro also FAILS the
// bundle if we statically `require()` a package that isn't installed — so we do
// NOT import them here. Instead the provider is REGISTERED at runtime.
//
// In a native build, install the modules (+ their config plugins) and register a
// provider once at startup, e.g. in app/_layout.tsx:
//
//   import { setAttestationProvider } from '@/lib/attestation';
//   import AppAttest from 'react-native-ios-appattest';
//   import PlayIntegrity from 'react-native-google-play-integrity';
//   setAttestationProvider(Platform.OS === 'ios'
//     ? { isSupported: AppAttest.isSupported, generateKey: AppAttest.generateKey,
//         attestKey: AppAttest.attestKey, generateAssertion: AppAttest.generateAssertion }
//     : { isSupported: PlayIntegrity.isSupported, requestIntegrityToken: PlayIntegrity.requestIntegrityToken });
//
// Until a provider is registered, attestation is skipped (dev/Expo Go keep working).
export interface NativeAttestation {
  isSupported(): Promise<boolean>;
  // Android: return a Play Integrity token bound to `nonce` (our challenge).
  requestIntegrityToken?(nonce: string): Promise<string>;
  // iOS: generate/attest a Secure Enclave key and produce assertions.
  generateKey?(): Promise<string>; // returns keyId (base64)
  attestKey?(keyId: string, clientDataHashB64: string): Promise<string>; // base64 attestation
  generateAssertion?(keyId: string, clientDataHashB64: string): Promise<string>; // base64 assertion
}

let provider: NativeAttestation | null = null;

// Register the native attestation provider (called from a native build).
export function setAttestationProvider(p: NativeAttestation | null): void {
  provider = p;
}

const IOS_KEY_STORAGE = 'rotopay.appattest.keyId';

// In-memory attestation token + expiry (refreshed ~10 min before it lapses).
let cachedToken: string | null = null;
let cachedExp = 0;
let inFlight: Promise<string | null> | null = null;

export function getCachedAttestationToken(): string | null {
  if (cachedToken && Date.now() < cachedExp) return cachedToken;
  return null;
}

const sha256B64 = (input: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });

async function postJson(baseUrl: string, path: string, body: unknown): Promise<any> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client': __DEV__ ? 'mobile-local' : 'mobile' },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Attestation request failed (${res.status})`);
  }
  return json.data;
}

// Run (or reuse an in-flight) attestation handshake; returns the token or null
// when the device can't attest (provider missing / unsupported).
export async function ensureAttestation(baseUrl: string): Promise<string | null> {
  const existing = getCachedAttestationToken();
  if (existing) return existing;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const p = provider;
    if (!p || !(await p.isSupported().catch(() => false))) return null;

    try {
      const { challenge } = await postJson(baseUrl, '/attestation/challenge', {});

      let data: { attestationToken: string };
      if (Platform.OS === 'android' && p.requestIntegrityToken) {
        const token = await p.requestIntegrityToken(challenge);
        data = await postJson(baseUrl, '/attestation/verify', { platform: 'android', token, challenge });
      } else if (Platform.OS === 'ios') {
        data = await iosHandshake(baseUrl, p, challenge);
      } else {
        return null;
      }

      cachedToken = data.attestationToken;
      // Trust the token for ~50 min (backend TTL is 1h); refresh before expiry.
      cachedExp = Date.now() + 50 * 60 * 1000;
      return cachedToken;
    } catch {
      // Best-effort: a failed handshake shouldn't crash the app. If the backend
      // enforces attestation, the actual request will get a clear 401.
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// iOS: register the key on first run (attest), then assert on later handshakes.
async function iosHandshake(
  baseUrl: string,
  p: NativeAttestation,
  challenge: string
): Promise<{ attestationToken: string }> {
  const clientDataHash = await sha256B64(challenge);

  let keyId = await Storage.getItem(IOS_KEY_STORAGE);
  if (!keyId) {
    if (!p.generateKey || !p.attestKey) throw new Error('iOS attest unavailable');
    keyId = await p.generateKey();
    const attestation = await p.attestKey(keyId, clientDataHash);
    const data = await postJson(baseUrl, '/attestation/attest', { keyId, attestation, challenge });
    await Storage.setItem(IOS_KEY_STORAGE, keyId);
    return data;
  }

  if (!p.generateAssertion) throw new Error('iOS assert unavailable');
  const assertion = await p.generateAssertion(keyId, clientDataHash);
  return postJson(baseUrl, '/attestation/verify', { platform: 'ios', keyId, assertion, challenge });
}

// Clear the cached token (e.g. on logout).
export function clearAttestation(): void {
  cachedToken = null;
  cachedExp = 0;
}
