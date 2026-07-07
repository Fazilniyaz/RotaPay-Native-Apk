// lib/deviceIntegrity.ts
// ─────────────────────────────────────────────
// Environment checks (blueprint point 3): basic root / jailbreak detection so we
// can restrict sensitive features on a compromised device, where the OS security
// guarantees (Keychain/Keystore isolation, secure enclave) can't be trusted.
//
// Uses expo-device's official (experimental) root/jailbreak heuristic plus an
// emulator check. Results are cached for the session. This is a deterrent, not a
// guarantee — a determined attacker can defeat any on-device check — so it's one
// layer alongside App Attestation (point 2) and server-side auth (zero-trust).
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import * as Device from 'expo-device';

export interface DeviceIntegrity {
  // Rooted (Android) / jailbroken (iOS) — the security-critical signal.
  compromised: boolean;
  // Emulator / simulator — informational (don't block; dev + CI run here).
  isEmulator: boolean;
  reasons: string[];
}

let cached: DeviceIntegrity | null = null;
let inFlight: Promise<DeviceIntegrity> | null = null;

export async function checkDeviceIntegrity(): Promise<DeviceIntegrity> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const reasons: string[] = [];
    let compromised = false;
    let isEmulator = false;

    // Web isn't a hardening target.
    if (Platform.OS === 'web') {
      cached = { compromised: false, isEmulator: false, reasons: [] };
      return cached;
    }

    try {
      if (await Device.isRootedExperimentalAsync()) {
        compromised = true;
        reasons.push(Platform.OS === 'ios' ? 'Jailbreak detected' : 'Root access detected');
      }
    } catch {
      // Detection unavailable on this platform/build — fail open (don't lock users out).
    }

    try {
      // Device.isDevice is false on an emulator/simulator.
      if (Device.isDevice === false) {
        isEmulator = true;
        reasons.push('Running on an emulator/simulator');
      }
    } catch {
      /* ignore */
    }

    cached = { compromised, isEmulator, reasons };
    inFlight = null;
    return cached;
  })();

  return inFlight;
}

export function getCachedIntegrity(): DeviceIntegrity | null {
  return cached;
}
