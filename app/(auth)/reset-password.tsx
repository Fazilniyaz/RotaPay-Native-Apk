import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { notify } from '../../lib/toast';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { authAPI } from '../../lib/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function validatePw(p: string): string | null {
    if (p.length < 8)     return 'At least 8 characters required';
    if (!/[A-Z]/.test(p)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(p)) return 'Must contain a lowercase letter';
    if (!/\d/.test(p))    return 'Must contain a number';
    return null;
}

export default function ResetPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ token?: string }>();

    const [token, setToken]       = useState(params.token ?? '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm]   = useState('');
    const [pwErr, setPwErr]       = useState('');
    const [confirmErr, setConfirmErr] = useState('');
    const [loading, setLoading]   = useState(false);
    const [done, setDone]         = useState(false);

    useEffect(() => {
        const sub = Linking.addEventListener('url', ({ url }) => {
            const { queryParams } = Linking.parse(url);
            if (queryParams?.token) setToken(queryParams.token as string);
        });
        return () => sub.remove();
    }, []);

    const handleReset = async () => {
        setPwErr(''); setConfirmErr('');
        let ok = true;
        if (!token.trim()) { notify('Error', 'Reset token is missing'); return; }
        const e = validatePw(password);
        if (e) { setPwErr(e); ok = false; }
        if (!confirm)             { setConfirmErr('Please confirm your password'); ok = false; }
        else if (password !== confirm) { setConfirmErr('Passwords do not match'); ok = false; }
        if (!ok) return;

        setLoading(true);
        try {
            await authAPI.resetPassword(token.trim(), password);
            setDone(true);
        } catch (err: any) {
            notify('Error', err.response?.data?.message ?? 'Reset failed. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
                <LinearGradient colors={[COLORS.secondary, COLORS.tertiary]} style={styles.iconCircle}>
                    <Ionicons name="checkmark-circle" size={48} color="#fff" />
                </LinearGradient>
                <Text style={styles.title}>Password Reset!</Text>
                <Text style={styles.subtitle}>Your password has been updated successfully. You can now sign in with your new password.</Text>
                <Button title="Sign In" onPress={() => router.replace('/(auth)/login')} style={{ width: '80%' }} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
            removeClippedSubviews={false}
        >
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.iconCircle}>
                <Ionicons name="key-outline" size={40} color="#fff" />
            </LinearGradient>

            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter a strong new password for your account.</Text>

            <View style={styles.formCard}>
                {!params.token && (
                    <InputField label="Reset Token" icon="key-outline" placeholder="Paste token from email"
                        value={token} onChangeText={setToken} autoCapitalize="none"
                    />
                )}
                <InputField label="New Password" icon="lock-closed-outline" placeholder="••••••••"
                    value={password} onChangeText={t => { setPassword(t); setPwErr(''); }}
                    isPassword error={pwErr}
                />
                <InputField label="Confirm Password" icon="lock-closed-outline" placeholder="••••••••"
                    value={confirm} onChangeText={t => { setConfirm(t); setConfirmErr(''); }}
                    isPassword error={confirmErr}
                />
                <Button title="Reset Password" onPress={handleReset} loading={loading} style={{ width: '100%' }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll:     { backgroundColor: COLORS.surface },
    container:  { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
    backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 32 },
    backText:   { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
    iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...SHADOW.button },
    title:      { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 8, textAlign: 'center' },
    subtitle:   { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    formCard:   { width: '100%', backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, padding: 20, borderWidth: 1, borderColor: COLORS.outlineVar + '40', ...SHADOW.card },
});
