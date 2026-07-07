import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { notify } from '../../lib/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../lib/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import Button from '../../components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmailSentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { email } = useLocalSearchParams<{ email: string }>();
    const [resending, setResending] = useState(false);
    const [resent, setResent]       = useState(false);

    const handleResend = async () => {
        setResending(true);
        try {
            await authAPI.resendVerification(email ?? '');
            setResent(true);
            setTimeout(() => setResent(false), 3000);
        } catch {
            notify('Error', 'Could not resend email. Try again later.');
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
            <Text style={styles.brand}>RotoPay</Text>

            {/* Animated icon */}
            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.iconCircle}>
                <Ionicons name="mail" size={48} color="#fff" />
            </LinearGradient>

            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.body}>
                We've sent a verification link to{' '}
                <Text style={{ fontFamily: FONTS.bold, color: COLORS.onSurface }}>{email}</Text>.
                {' '}Click the link to activate your account.
            </Text>

            <Button
                title="Back to Sign In"
                onPress={() => router.replace('/(auth)/login')}
                style={{ width: '100%', marginBottom: 16 }}
            />

            <Text style={styles.didntGet}>Didn't receive the email?</Text>
            <TouchableOpacity onPress={handleResend} disabled={resending} style={{ marginTop: 6 }}>
                <Text style={[styles.resendBtn, resent && { color: COLORS.secondary }]}>
                    {resending ? 'SENDING…' : resent ? '✓ EMAIL SENT!' : 'RESEND EMAIL'}
                </Text>
            </TouchableOpacity>

            <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.hintText}>
                    Check your spam folder if you don't see it within a few minutes.
                </Text>
            </View>

            <Text style={styles.footer}>© 2024 RotoPay Financial Systems</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: COLORS.surface,
        alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40,
    },
    brand:      { fontSize: 20, fontFamily: FONTS.extraBold, color: COLORS.primary, marginBottom: 32 },
    iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...SHADOW.button },
    title:      { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 12, textAlign: 'center' },
    body:       { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    didntGet:   { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.outline, marginTop: 8 },
    resendBtn:  { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
    hintBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 24, padding: 14, backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary + '30' },
    hintText:   { flex: 1, fontSize: 12, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 18 },
    footer:     { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline, position: 'absolute', bottom: 24 },
});
