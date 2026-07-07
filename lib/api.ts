import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Storage } from './storage';
import { getCachedAttestationToken, ensureAttestation } from './attestation';

const PORT = 5000;

// In-memory copy of the access token, kept in sync by the auth slice (login /
// google / restore / logout). Used as the primary source so every request has
// the token the app currently holds even if a persisted read lags or fails;
// falls back to Storage (e.g. after a fresh reload before the slice hydrates).
let authToken: string | null = null;
export function setAuthToken(token: string | null): void {
    authToken = token;
}

// Where the backend lives, resolved per-runtime so we never hardcode a LAN IP.
//
// A phone/emulator can't reach the PC via "localhost" (that means the device
// itself). In dev we borrow the IP of the Expo dev server (Metro already knows
// the PC's LAN address), so it stays correct even when DHCP changes it.
//   • Physical device / Android emulator → the dev-machine IP from Expo
//   • Web / iOS simulator                → localhost
//   • Production build                   → set EXPO_PUBLIC_API_URL at build time
function resolveBaseUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '') + '/api';

    if (__DEV__) {
        // e.g. "192.168.0.109:8081" — the host part is the PC's LAN IP.
        const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
        const host = hostUri?.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
            return `http://${host}:${PORT}/api`;
        }
        // Android emulator reaches the host via the special 10.0.2.2 alias.
        if (Platform.OS === 'android') return `http://10.0.2.2:${PORT}/api`;
    }
    return `http://localhost:${PORT}/api`;
}

const BASE_URL = resolveBaseUrl();

// Tells the backend which client this is, so verification / reset email links
// point back at the app rather than the web app. Dev (Expo) → localhost:8081;
// production (Play Store) → the `rotopay://` deep link.
const CLIENT_ID = __DEV__ ? 'mobile-local' : 'mobile';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json', 'X-Client': CLIENT_ID },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
    failedQueue = [];
};

// Attach JWT + device-attestation token on every request. The attestation token
// proves the app binary is genuine (Play Integrity / App Attest). It's attached
// when available; a background handshake keeps it fresh. No-op on web / when the
// native attestation module isn't present, so the app still works everywhere.
api.interceptors.request.use(async (config) => {
    const token = authToken ?? (await Storage.getToken());
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const attToken = getCachedAttestationToken();
    if (attToken) {
        config.headers['X-Attestation-Token'] = attToken;
    } else if (Platform.OS !== 'web') {
        // Kick off (or reuse) a handshake in the background; don't block the request.
        ensureAttestation(BASE_URL).catch(() => undefined);
    }
    return config;
});

// 401 → refresh → retry, or clear & propagate
api.interceptors.response.use(
    res => res,
    async (error) => {
        const original = error.config as any;
        if (
            error.response?.status !== 401 ||
            original._retry ||
            original.url?.includes('/auth/login') ||
            original.url?.includes('/auth/register') ||
            original.url?.includes('/auth/refresh-token')
        ) return Promise.reject(error);

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                original.headers.Authorization = `Bearer ${token}`;
                return api(original);
            });
        }

        isRefreshing = true;
        original._retry = true;

        try {
            const refreshToken = await Storage.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');
            const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            await Storage.saveToken(accessToken);
            await Storage.saveRefreshToken(newRefreshToken);
            setAuthToken(accessToken);
            original.headers.Authorization = `Bearer ${accessToken}`;
            processQueue(null, accessToken);
            return api(original);
        } catch (err) {
            // Session is gone — clear everything and send the user to login so
            // they aren't stranded on endless 401s.
            processQueue(err, null);
            setAuthToken(null);
            await Storage.clear();
            try { router.replace('/(auth)/login'); } catch { /* router not ready */ }
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }
);

export const authAPI = {
    login:              (email: string, password: string) => api.post('/auth/login', { email, password }),
    register:           (email: string, password: string, displayName?: string) => api.post('/auth/register', { email, password, displayName }),
    google:             (idToken: string) => api.post('/auth/google', { idToken }),
    forgotPassword:     (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword:      (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
    verifyEmail:        (token: string) => api.post('/auth/verify-email', { token }),
    resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
    logout:             (logoutAll = false) => api.post('/auth/logout', { logoutAll }),
};

export default api;
