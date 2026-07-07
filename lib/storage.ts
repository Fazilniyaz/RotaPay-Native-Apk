import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
    TOKEN:         'rp_access_token',
    REFRESH_TOKEN: 'rp_refresh_token',
    USER:          'rp_user',
};

// expo-secure-store stores values in the iOS Keychain / Android Keystore
// (hardware-backed secure storage) — never plaintext on disk. On web we fall
// back to localStorage (dev only; the web app isn't the hardening target).
//
// keychainAccessible = AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: the item is readable
// only after the device has been unlocked once since boot, and is bound to THIS
// device (excluded from iCloud Keychain sync / encrypted backups), so tokens +
// PII can't leak to another device via backup.
const SECURE_OPTS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value, SECURE_OPTS);
    }
}

async function get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
}

async function remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}

export const Storage = {
    // Generic secure key/value access (backed by Keychain/Keystore on device,
    // localStorage on web) — used e.g. for the App Attest keyId.
    getItem:    (key: string)                => get(key),
    setItem:    (key: string, value: string) => set(key, value),
    removeItem: (key: string)                => remove(key),

    saveToken:        (token: string)  => set(KEYS.TOKEN, token),
    getToken:         ()               => get(KEYS.TOKEN),
    saveRefreshToken: (token: string)  => set(KEYS.REFRESH_TOKEN, token),
    getRefreshToken:  ()               => get(KEYS.REFRESH_TOKEN),
    saveUser:         (user: object)   => set(KEYS.USER, JSON.stringify(user)),
    getUser: async (): Promise<any | null> => {
        const raw = await get(KEYS.USER);
        return raw ? JSON.parse(raw) : null;
    },
    clear: async () => {
        await Promise.all([remove(KEYS.TOKEN), remove(KEYS.REFRESH_TOKEN), remove(KEYS.USER)]);
    },
};
