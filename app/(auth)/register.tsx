import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { notify } from '../../lib/toast';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { registerThunk } from '../../store/slices/authSlice';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStrength(p: string) {
    if (!p) return { level: 0, label: '', color: COLORS.surfaceHigh };
    const long = p.length >= 8, upper = /[A-Z]/.test(p), lower = /[a-z]/.test(p), num = /\d/.test(p);
    if (long && upper && lower && num && p.length > 12) return { level: 4, label: 'Strong', color: COLORS.secondary };
    if (long && upper && lower && num)  return { level: 3, label: 'Good',   color: '#eab308' };
    if (p.length > 5)                   return { level: 2, label: 'Fair',   color: '#f97316' };
    return { level: 1, label: 'Weak', color: COLORS.error };
}

function validatePw(p: string): string | null {
    if (p.length < 8)    return 'At least 8 characters required';
    if (!/[A-Z]/.test(p)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(p)) return 'Must contain a lowercase letter';
    if (!/\d/.test(p))    return 'Must contain a number';
    return null;
}

export default function RegisterScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading } = useSelector((s: RootState) => s.auth);
    const google = useGoogleAuth({ onSuccess: () => router.replace('/(app)/dashboard') });

    const [name, setName]                 = useState('');
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [confirm, setConfirm]           = useState('');
    const [termsAccepted, setTerms]       = useState(false);
    const [nameErr, setNameErr]           = useState('');
    const [emailErr, setEmailErr]         = useState('');
    const [pwErr, setPwErr]               = useState('');
    const [confirmErr, setConfirmErr]     = useState('');

    const strength = getStrength(password);

    const handleRegister = async () => {
        setNameErr(''); setEmailErr(''); setPwErr(''); setConfirmErr('');
        let ok = true;

        if (!name.trim())                    { setNameErr('Full name is required'); ok = false; }
        else if (name.trim().length < 2)     { setNameErr('Name must be at least 2 characters'); ok = false; }
        if (!email.trim())                   { setEmailErr('Email is required'); ok = false; }
        else if (!EMAIL_REGEX.test(email.trim())) { setEmailErr('Enter a valid email address'); ok = false; }
        if (!password)                       { setPwErr('Password is required'); ok = false; }
        else { const e = validatePw(password); if (e) { setPwErr(e); ok = false; } }
        if (!confirm)                        { setConfirmErr('Please confirm your password'); ok = false; }
        else if (password !== confirm)       { setConfirmErr('Passwords do not match'); ok = false; }
        if (!termsAccepted) { notify('Terms Required', 'Please accept the Terms of Service'); return; }
        if (!ok) return;

        const result = await dispatch(registerThunk({ email: email.trim(), password, displayName: name.trim() }));
        if (registerThunk.fulfilled.match(result)) {
            router.replace({ pathname: '/(auth)/email-sent', params: { email: email.trim() } });
        } else {
            notify('Registration Failed', (result.payload as string) ?? 'Registration failed');
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {/* removeClippedSubviews={false}: with the Fabric renderer, clipping re-parents
                children as this screen unmounts on navigate, which crashes the app
                ("child already has a parent" in ReactClippingViewManager). */}
            <ScrollView
                style={{ backgroundColor: COLORS.surface }}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
            >

                {/* Gradient banner */}
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                    <View style={styles.logoRow}>
                        <View style={styles.logoIcon}><Text style={{ fontSize: 26 }}>💳</Text></View>
                        <Text style={styles.logoText}>payRoto</Text>
                    </View>
                    <Text style={styles.headline}>Join payRoto</Text>
                    <Text style={styles.tagline}>Take control of your shifts & earnings</Text>
                </LinearGradient>

                {/* Form */}
                <View style={styles.card}>
                    <Text style={styles.heading}>Create Account</Text>
                    <Text style={styles.subheading}>Free forever — no credit card required</Text>

                    <InputField label="Full Name *" icon="person-outline" placeholder="John Doe"
                        value={name} onChangeText={t => { setName(t); setNameErr(''); }}
                        error={nameErr}
                    />
                    <InputField label="Email Address" icon="mail-outline" placeholder="name@company.com"
                        value={email} onChangeText={t => { setEmail(t); setEmailErr(''); }}
                        keyboardType="email-address" autoCapitalize="none" error={emailErr}
                    />
                    <InputField label="Password" icon="lock-closed-outline" placeholder="••••••••"
                        value={password} onChangeText={t => { setPassword(t); setPwErr(''); }}
                        isPassword error={pwErr}
                    />

                    {password.length > 0 && (
                        <View style={styles.strengthWrap}>
                            <View style={styles.strengthBar}>
                                {[1,2,3,4].map(i => (
                                    <View key={i} style={[styles.seg, { backgroundColor: strength.level >= i ? strength.color : COLORS.surfaceHigh }]} />
                                ))}
                            </View>
                            <View style={styles.strengthMeta}>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                                <Text style={styles.minChars}>Min. 8 chars + upper + number</Text>
                            </View>
                        </View>
                    )}

                    <InputField label="Confirm Password" icon="lock-closed-outline" placeholder="••••••••"
                        value={confirm} onChangeText={t => { setConfirm(t); setConfirmErr(''); }}
                        isPassword error={confirmErr}
                    />

                    {/* Terms */}
                    <TouchableOpacity style={styles.termsRow} onPress={() => setTerms(v => !v)} activeOpacity={0.7}>
                        <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                            {termsAccepted && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <Text style={styles.termsText}>
                            I agree to the{' '}
                            <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold }}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold }}>Privacy Policy</Text>
                        </Text>
                    </TouchableOpacity>

                    <Button title="Create Account" onPress={handleRegister} loading={isLoading} style={{ width: '100%', marginTop: 4 }} />

                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={[styles.googleBtn, google.loading && { opacity: 0.6 }]} activeOpacity={0.8} onPress={google.signIn} disabled={google.loading}>
                        <Text style={{ fontSize: 20 }}>G</Text>
                        <Text style={styles.googleText}>{google.loading ? 'Signing in…' : 'Continue with Google'}</Text>
                    </TouchableOpacity>

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.footerLink}>Sign in</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: COLORS.surface },

    banner: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    logoIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 22, fontFamily: FONTS.extraBold, color: '#fff' },
    headline: { fontSize: 26, fontFamily: FONTS.extraBold, color: '#fff', marginBottom: 4 },
    tagline:  { fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.8)' },

    card: {
        margin: 16, padding: 24,
        backgroundColor: COLORS.surfaceLowest,
        borderRadius: RADIUS.xl,
        borderWidth: 1, borderColor: COLORS.outlineVar + '40',
        ...SHADOW.card, marginBottom: 32,
    },
    heading:    { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 4 },
    subheading: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, marginBottom: 20 },

    strengthWrap: { marginTop: -8, marginBottom: 12 },
    strengthBar:  { flexDirection: 'row', gap: 5, marginBottom: 4 },
    seg:          { flex: 1, height: 4, borderRadius: 2 },
    strengthMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    strengthLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 },
    minChars:      { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.3 },

    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14, paddingTop: 2 },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.outlineVar, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    termsText: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 20 },

    dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
    dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.outlineVar + '50' },
    dividerText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 1 },

    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md,
        paddingVertical: 12, marginBottom: 18,
    },
    googleText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.onSurfaceVar },

    footerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    footerText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar },
    footerLink: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
});
