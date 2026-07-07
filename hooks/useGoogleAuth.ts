import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { googleLoginThunk } from '../store/slices/authSlice';
import { notify } from '../lib/toast';

// Finish any auth session that was completed in a web popup / redirect.
WebBrowser.maybeCompleteAuthSession();

// OAuth client IDs come from env (public — same idea as the Admin's
// NEXT_PUBLIC_GOOGLE_CLIENT_ID). Set at least the web client id; add the
// iOS/Android ones for native builds.
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
const WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const ANY = WEB || IOS || ANDROID;

export const googleConfigured = !!ANY;

/**
 * Cross-platform "Continue with Google" flow, mirroring the Admin web app:
 * obtain a Google ID token, exchange it at POST /auth/google, then store the
 * returned session. Returns a `signIn` handler + loading/availability flags.
 */
export function useGoogleAuth(opts?: { onSuccess?: () => void }) {
    const dispatch = useDispatch<AppDispatch>();
    const [loading, setLoading] = useState(false);

    // On web, expo-auth-session's auto-generated redirect URI is ambiguous
    // (trailing slash / path), and Google requires an EXACT match under
    // "Authorised redirect URIs". Pin it to the plain origin so we know exactly
    // what to register (e.g. http://localhost:8081, or the deployed origin).
    const webRedirectUri =
        Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;

    // `clientId` is a defined fallback so the hook never throws when a specific
    // platform id is missing (we gate actual use behind `googleConfigured`).
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: ANY ?? '',
        webClientId: WEB,
        iosClientId: IOS,
        androidClientId: ANDROID,
        ...(webRedirectUri ? { redirectUri: webRedirectUri } : {}),
    });

    // Surface the exact redirect URI in dev so it can be copied into Google Cloud.
    useEffect(() => {
        if (__DEV__ && request?.redirectUri) {
            // eslint-disable-next-line no-console
            console.log('[GoogleAuth] redirect_uri to register in Google Cloud →', request.redirectUri);
        }
    }, [request?.redirectUri]);

    useEffect(() => {
        if (!response) return;

        if (response.type === 'success') {
            const idToken =
                response.params?.id_token ?? (response.authentication as any)?.idToken;
            if (!idToken) {
                notify.error('Google sign-in failed', 'No token was returned. Please try again.');
                return;
            }
            setLoading(true);
            dispatch(googleLoginThunk(idToken)).then((res) => {
                setLoading(false);
                if (googleLoginThunk.fulfilled.match(res)) {
                    opts?.onSuccess?.();
                } else {
                    notify.error('Google sign-in failed', (res.payload as string) ?? 'Please try again.');
                }
            });
        } else if (response.type === 'error') {
            notify.error('Google sign-in failed', 'Please try again.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [response]);

    const signIn = () => {
        if (!googleConfigured || !request) {
            notify.info('Google sign-in', 'Google sign-in isn’t configured yet.');
            return;
        }
        promptAsync();
    };

    return { signIn, loading, available: googleConfigured && !!request };
}
