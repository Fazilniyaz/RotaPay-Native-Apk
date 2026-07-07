import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { notify } from '../../lib/toast';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../lib/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail]   = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent]     = useState(false);

    const handleSend = async () => {
        if (!email.trim()) { notify('Error', 'Enter your email address'); return; }
        setLoading(true);
        try {
            await authAPI.forgotPassword(email.trim());
            setSent(true);
        } catch {
            notify('Error', 'Could not send reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>

            {/* Icon header */}
            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.iconCircle}>
                <Ionicons name={sent ? 'checkmark-circle' : 'lock-open-outline'} size={40} color="#fff" />
            </LinearGradient>

            <Text style={styles.title}>{sent ? 'Check Your Email' : 'Forgot Password?'}</Text>
            <Text style={styles.subtitle}>
                {sent
                    ? `We've sent a reset link to\n${email}`
                    : "No worries — enter your email and we'll send you a reset link."
                }
            </Text>

            {!sent && (
                <>
                    <View style={styles.formCard}>
                        <InputField
                            label="Email Address" icon="mail-outline"
                            placeholder="name@company.com"
                            value={email} onChangeText={setEmail}
                            keyboardType="email-address" autoCapitalize="none"
                        />
                        <Button title="Send Reset Link" onPress={handleSend} loading={loading} style={{ width: '100%' }} />
                    </View>

                    <View style={styles.badgeRow}>
                        <View style={styles.badge}><Ionicons name="shield-checkmark-outline" size={16} color={COLORS.secondary} /><Text style={styles.badgeText}>SSL Secured</Text></View>
                        <View style={styles.badge}><Ionicons name="headset-outline" size={16} color={COLORS.primary} /><Text style={styles.badgeText}>24/7 Support</Text></View>
                    </View>
                </>
            )}

            {sent && (
                <Button
                    title="Back to Sign In"
                    onPress={() => router.replace('/(auth)/login')}
                    style={{ width: '80%', marginTop: 8 }}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { backgroundColor: COLORS.surface },
    container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 32 },
    backText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
    iconCircle: {
        width: 96, height: 96, borderRadius: 48,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, ...SHADOW.button,
    },
    title:    { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    formCard: { width: '100%', backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, padding: 20, borderWidth: 1, borderColor: COLORS.outlineVar + '40', ...SHADOW.card },
    badgeRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    badge:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceContainer, borderRadius: RADIUS.md, padding: 12, justifyContent: 'center' },
    badgeText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.onSurfaceVar },
});
