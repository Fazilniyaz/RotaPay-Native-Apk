import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// The backend builds reset links as: CLIENT_URL/auth/reset-password?token=...
// Expo Router route groups (auth) are transparent in URLs — the actual URL is /reset-password.
// This file lives at app/auth/reset-password.tsx → accessible at /auth/reset-password,
// and immediately forwards to the real screen with the token param.
export default function ResetPasswordDeepLink() {
    const router = useRouter();
    const { token } = useLocalSearchParams<{ token?: string }>();

    useEffect(() => {
        router.replace({
            pathname: '/(auth)/reset-password',
            params: { token: token ?? '' },
        });
    }, [token]);

    return <View />;
}
