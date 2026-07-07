// lib/geolocation.ts
// ─────────────────────────────────────────────
// Best-effort location resolver for the auto-created onboarding employee.
// Requests foreground location permission, reads the current position and
// reverse-geocodes it ON-DEVICE (expo-location, no network call) to a readable
// label like "Camden, London, GB". If the user denies permission — or anything
// else goes wrong — it resolves to the literal string "unknown location".
// It NEVER throws, so callers can await it unconditionally.
// ─────────────────────────────────────────────
import * as Location from 'expo-location';

export const UNKNOWN_LOCATION = 'unknown location';

export async function resolveLocationLabel(): Promise<string> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return UNKNOWN_LOCATION;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;

    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        const parts = [
          place.city || place.subregion || place.district,
          place.region,
          place.isoCountryCode,
        ].filter((p): p is string => Boolean(p && p.trim()));
        if (parts.length) return parts.join(', ');
      }
    } catch {
      // Reverse geocode failed — fall back to raw coordinates below.
    }

    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch {
    // Permission denied, location services off, or position unavailable.
    return UNKNOWN_LOCATION;
  }
}
