import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { notify } from '../../lib/toast';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { loginThunk } from '../../store/slices/authSlice';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
    { icon: '⚡', title: 'Real-time Tracking', desc: 'Instant shift and earnings updates' },
    { icon: '🔒', title: 'Secure & Private',   desc: 'Bank-grade encryption for your data' },
    { icon: '📊', title: 'Smart Reports',       desc: 'Weekly, monthly & yearly insights' },
];

export default function LoginScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading } = useSelector((s: RootState) => s.auth);
    const google = useGoogleAuth({ onSuccess: () => router.replace('/(app)/dashboard') });

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const handleLogin = async () => {
        // Settle the view tree before any navigation happens below.
        Keyboard.dismiss();
        if (!email.trim() || !password) {
            notify('Error', 'Please fill in all fields');
            return;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
            notify('Error', 'Please enter a valid email address');
            return;
        }
        const result = await dispatch(loginThunk({ email: email.trim(), password }));
        if (loginThunk.fulfilled.match(result)) {
            router.replace('/(app)/dashboard');
        } else {
            const msg = (result.payload as string) ?? 'Login failed';
            if (msg.toLowerCase().includes('verify')) {
                router.push({ pathname: '/(auth)/email-sent', params: { email: email.trim() } });
            } else {
                notify('Login Failed', msg);
            }
        }
    };

    // No KeyboardAvoidingView behavior on Android: 'height' resizes and re-renders
    // children, and navigating away mid-adjustment makes Fabric re-parent a child that
    // still has a parent -> hard crash. Android handles the keyboard natively
    // (adjustResize), so the behavior isn't needed there.
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            {/* removeClippedSubviews={false}: with the Fabric renderer, clipping re-parents
                children as this screen unmounts on navigate, which crashes the app
                ("child already has a parent" in ReactClippingViewManager). */}
            <ScrollView
                style={{ backgroundColor: COLORS.surface }}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
            >

                {/* Gradient banner — mirrors WebApp left panel */}
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                    <View style={styles.bannerLogoRow}>
                        <View style={styles.bannerLogoIcon}><Text style={{ fontSize: 28 }}>💳</Text></View>
                        <Text style={styles.bannerLogoText}>payRoto</Text>
                    </View>
                    <Text style={styles.bannerHeadline}>Financial precision,{'\n'}delivered.</Text>
                    <View style={styles.featureList}>
                        {FEATURES.map(f => (
                            <View key={f.title} style={styles.featureRow}>
                                <View style={styles.featureIcon}><Text style={{ fontSize: 18 }}>{f.icon}</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.featureTitle}>{f.title}</Text>
                                    <Text style={styles.featureDesc}>{f.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Form card */}
                <View style={styles.card}>
                    {/* Logo top-center of the form */}
                    <View style={styles.formLogo}>
                        <View style={styles.formLogoIcon}><Text style={{ fontSize: 26 }}>💳</Text></View>
                        <Text style={styles.formLogoText}>payRoto</Text>
                    </View>
                    <Text style={styles.heading}>Welcome back</Text>
                    <Text style={styles.subheading}>Sign in to your payRoto account</Text>

                    <InputField
                        label="Email Address" icon="mail-outline"
                        placeholder="name@company.com"
                        value={email} onChangeText={setEmail}
                        keyboardType="email-address" autoCapitalize="none"
                    />

                    <View style={styles.pwRow}>
                        <Text style={styles.pwLabel}>PASSWORD</Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                            <Text style={styles.forgotLink}>Forgot?</Text>
                        </TouchableOpacity>
                    </View>
                    <InputField
                        label="" icon="lock-closed-outline"
                        placeholder="••••••••"
                        value={password} onChangeText={setPassword}
                        isPassword
                    />

                    {/* Remember me */}
                    <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                        <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                            {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <Text style={styles.rememberText}>Keep me signed in</Text>
                    </TouchableOpacity>

                    <Button title="Sign In" onPress={handleLogin} loading={isLoading} style={{ marginTop: 4, width: '100%' }} />

                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={[styles.googleBtn, google.loading && { opacity: 0.6 }]} activeOpacity={0.8} onPress={google.signIn} disabled={google.loading}>
                        <Text style={{ fontSize: 20 }}>G</Text>
                        <Text style={styles.googleText}>{google.loading ? 'Signing in…' : 'Continue with Google'}</Text>
                    </TouchableOpacity>

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={styles.footerLink}>Create account</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: COLORS.surface },

    banner: {
        paddingHorizontal: 24, paddingTop: 56, paddingBottom: 28,
    },
    bannerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    bannerLogoIcon: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    bannerLogoText: { fontSize: 24, fontFamily: FONTS.extraBold, color: '#fff' },
    bannerHeadline: { fontSize: 22, fontFamily: FONTS.extraBold, color: '#fff', lineHeight: 30, marginBottom: 16 },
    featureList:    { gap: 10 },
    featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureIcon:    { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    featureTitle:   { fontSize: 12, fontFamily: FONTS.bold, color: '#fff', marginBottom: 1 },
    featureDesc:    { fontSize: 11, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.75)' },

    card: {
        margin: 16, padding: 24,
        backgroundColor: COLORS.surfaceLowest,
        borderRadius: RADIUS.xl,
        borderWidth: 1, borderColor: COLORS.outlineVar + '40',
        ...SHADOW.card, marginBottom: 32,
    },
    formLogo:     { alignItems: 'center', gap: 8, marginBottom: 18 },
    formLogoIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
    formLogoText: { fontSize: 22, fontFamily: FONTS.extraBold, color: COLORS.primary },
    heading:    { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 4, textAlign: 'center' },
    subheading: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, marginBottom: 20, textAlign: 'center' },

    pwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    pwLabel:   { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.8, color: COLORS.onSurfaceVar },
    forgotLink: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary },

    rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
    checkbox:    { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.outlineVar, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    rememberText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar },

    dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
    dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.outlineVar + '50' },
    dividerText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 1 },

    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md,
        paddingVertical: 12, marginBottom: 18, backgroundColor: COLORS.surfaceLowest,
    },
    googleText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.onSurfaceVar },

    footerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    footerText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar },
    footerLink: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
});
