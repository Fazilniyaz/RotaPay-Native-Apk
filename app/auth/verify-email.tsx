import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../lib/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import Button from '../../components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerifyEmailDeepLink() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token } = useLocalSearchParams<{ token?: string }>();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email…');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Verification link is invalid or missing.');
            return;
        }
        authAPI.verifyEmail(token)
            .then(() => {
                setStatus('success');
                setMessage('Your email has been verified!');
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.message ?? 'Verification failed. The link may have expired.');
            });
    }, [token]);

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
            <Text style={styles.brand}>payRoto</Text>

            {status === 'loading' && (
                <>
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 20 }} />
                    <Text style={styles.message}>Verifying your email…</Text>
                </>
            )}

            {status === 'success' && (
                <>
                    <LinearGradient colors={[COLORS.secondary, COLORS.tertiary]} style={styles.iconCircle}>
                        <Ionicons name="checkmark-circle" size={48} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.title}>Email Verified!</Text>
                    <Text style={styles.message}>{message}</Text>
                    <Button
                        title="Sign In"
                        onPress={() => router.replace('/(auth)/login')}
                        style={{ width: '80%', marginTop: 8 }}
                    />
                </>
            )}

            {status === 'error' && (
                <>
                    <LinearGradient colors={[COLORS.error, '#ef4444']} style={styles.iconCircle}>
                        <Ionicons name="close-circle" size={48} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.title}>Verification Failed</Text>
                    <Text style={styles.message}>{message}</Text>
                    <Button
                        title="Back to Sign In"
                        onPress={() => router.replace('/(auth)/login')}
                        style={{ width: '80%', marginTop: 8 }}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: COLORS.surface,
        alignItems: 'center', paddingHorizontal: 24,
    },
    brand:      { fontSize: 20, fontFamily: FONTS.extraBold, color: COLORS.primary, marginBottom: 36 },
    iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...SHADOW.button },
    title:      { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 10, textAlign: 'center' },
    message:    { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, textAlign: 'center', lineHeight: 22 },
});
