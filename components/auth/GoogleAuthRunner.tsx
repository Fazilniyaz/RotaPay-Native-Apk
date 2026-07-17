import { useEffect, useRef } from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

// Runs the Google sign-in flow the moment it mounts, then reports back.
//
// Why this exists: `Google.useIdTokenAuthRequest` (inside useGoogleAuth) starts
// async work at MOUNT (makeAuthUrlAsync -> setState re-render). When login /
// register kept the hook mounted for their whole lifetime, that re-render could
// land exactly while the screen was being unmounted for navigation, and Fabric
// crashed with "addViewAt: ... child already has a parent" (see
// react-native-screens #1189 — same crash class with expo-web-browser auth).
// Mounting this component ONLY after the user taps "Continue with Google"
// keeps the auth machinery out of the mount/unmount path of the email/password
// flow entirely.
export function GoogleAuthRunner({
    onSuccess,
    onSettled,
}: {
    onSuccess: () => void;
    onSettled: () => void;
}) {
    const google = useGoogleAuth({ onSuccess });
    const started = useRef(false);
    const sawLoading = useRef(false);

    // Fire the prompt once the request is ready.
    useEffect(() => {
        if (google.available && !started.current) {
            started.current = true;
            google.signIn();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [google.available]);

    // When the backend exchange finishes (loading true -> false), settle.
    useEffect(() => {
        if (google.loading) sawLoading.current = true;
        else if (sawLoading.current) onSettled();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [google.loading]);

    return null;
}
