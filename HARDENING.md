# Mobile App Hardening (Blueprint Point 3)

| Sub-point | Status | Where |
|-----------|--------|-------|
| Zero hardcoded secrets | ✅ | No secrets in the binary (Google IDs are env-based public OAuth client IDs). Runtime config is fetched post-auth. |
| Obfuscation (R8/ProGuard, iOS symbols) | ✅ configured | `app.json` → `expo-build-properties` |
| Secure storage (Keychain/Keystore) | ✅ | `lib/storage.ts` (expo-secure-store, device-only) |
| Root / jailbreak detection | ✅ | `lib/deviceIntegrity.ts` + `DeviceIntegrityGate` |

## 1. Zero hardcoded secrets

Audit is clean — no API keys / private keys / secrets are hardcoded (`grep` found only
`EXPO_PUBLIC_GOOGLE_*` client IDs, which are public OAuth identifiers, not secrets). Note that
`EXPO_PUBLIC_*` values are inlined into the JS bundle, so **only put non-secret values there**.

Non-secret, tunable config is fetched **after login** via `GET /api/config`
(`lib/runtimeConfig.ts`, loaded in `app/(app)/_layout.tsx`). This is the channel for any future
sensitive/runtime config — deliver it per-request to an authenticated (and, per point 2, attested)
client instead of baking it into the APK/IPA. **Real secrets stay server-side and are never returned.**

## 2. Obfuscation

Configured in `app.json` via `expo-build-properties`:
- **Android**: `enableProguardInReleaseBuilds` (R8/ProGuard code shrinking + obfuscation) and
  `enableShrinkResourcesInReleaseBuilds`, with keep rules for `@DoNotStrip`-annotated RN classes.
  Hermes (bytecode, not readable JS) is on by default with the new architecture.
- **iOS**: Release/Archive builds already strip debug symbols (`STRIP_INSTALLED_PRODUCT`,
  `DEPLOYMENT_POSTPROCESSING`) and emit the dSYM separately — don't ship the dSYM inside the IPA.

Apply with a fresh native build:
```bash
npx expo prebuild --clean
eas build --platform android --profile production   # R8/ProGuard runs on release
eas build --platform ios --profile production
```
If a release build crashes from over-shrinking, add targeted `-keep` lines to `extraProguardRules`.

## 3. Secure storage

`lib/storage.ts` uses **expo-secure-store** — iOS **Keychain** / Android **Keystore**
(hardware-backed), never plaintext. Tokens **and** the user object (PII) go through it. No
`AsyncStorage`/plaintext is used for sensitive data (verified). Items are written with
`keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` → bound to the device and excluded from
iCloud Keychain sync / encrypted backups.

## 4. Root / jailbreak detection

`lib/deviceIntegrity.ts` uses `expo-device` (`isRootedExperimentalAsync`) + an emulator check,
cached per session. On a compromised device:
- `DeviceIntegrityGate` (mounted in `app/(app)/_layout.tsx`) shows a loud security warning.
- Sensitive actions restrict themselves via `useDeviceIntegrity()` — e.g. **clock-in is blocked** on
  a rooted/jailbroken device (it affects attendance + pay). Apply the same guard to other sensitive
  flows as needed.

Detection is experimental (can false-positive), so the gate allows an acknowledged bypass by default
(`ALLOW_BYPASS` in `DeviceIntegrityGate.tsx`) while still blocking the sensitive action; set it to
`false` for a hard block. This is a deterrent layer alongside App Attestation (point 2) and
server-side zero-trust auth.
