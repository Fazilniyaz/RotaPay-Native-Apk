import React, { useState } from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { refreshEmployers } from '../../store/slices/dataSlice';
import { loadSettings } from '../../store/slices/settingsSlice';
import { createEmployer, EmployerInput } from '../../lib/services/employers';
import { resolveLocationLabel } from '../../lib/geolocation';
import { notify } from '../../lib/toast';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

// Blocking onboarding step (RN counterpart of the web OnboardingGate). A user
// cannot use the app until they have at least one employee — the first becomes
// their DEFAULT employee (scope for calendar / earnings / reports).
const emptyForm: EmployerInput = { employerName: '', store: '', notes: '', isActive: true };

// Note stamped on the employee created automatically when the user dismisses
// onboarding with the "X" instead of filling the form.
const AUTO_ADDED_NOTE = 'Automatically added employee';

export function OnboardingGate() {
    const dispatch = useDispatch<AppDispatch>();
    const loaded = useSelector((s: RootState) => s.data.loaded);
    const employers = useSelector((s: RootState) => s.data.employers);
    const user = useSelector((s: RootState) => s.auth.user);

    const [form, setForm] = useState<EmployerInput>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [autoAdding, setAutoAdding] = useState(false);
    const busy = saving || autoAdding;

    // Wait for the first cache load; then gate only when there are no employees.
    const visible = loaded && employers.length === 0;

    const submit = async () => {
        if (!form.employerName.trim() || !form.store.trim()) {
            return notify('Error', 'Employee name and store are required');
        }
        setSaving(true);
        try {
            await createEmployer({
                employerName: form.employerName.trim(),
                store: form.store.trim(),
                notes: form.notes?.trim() || undefined,
                isActive: true,
            });
            // This first employee is now the default — refresh so the app unlocks.
            await Promise.all([dispatch(refreshEmployers()).unwrap(), dispatch(loadSettings())]);
            notify('Welcome aboard 🎉', 'You’re all set!');
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Could not create employee');
        } finally {
            setSaving(false);
        }
    };

    // "X" flow: instead of forcing the form, create a default employee for the
    // user automatically — named after their sign-up name, located via device
    // geolocation (or "unknown location" if they deny it), and tagged so it's
    // clear it was auto-generated. The backend makes this first employee the
    // default, unlocking the app until they add/switch another.
    const dismissWithAutoEmployee = async () => {
        if (busy) return;
        setAutoAdding(true);
        try {
            const employerName = user?.displayName?.trim() || 'My workplace';
            const location = await resolveLocationLabel();
            await createEmployer({
                employerName,
                store: location,
                notes: AUTO_ADDED_NOTE,
                isActive: true,
            });
            await Promise.all([dispatch(refreshEmployers()).unwrap(), dispatch(loadSettings())]);
            notify('All set 🎉', 'Added a default employee for you — you can edit it anytime.');
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Could not set you up automatically');
            setAutoAdding(false); // keep the gate open so they can try the form
        }
    };

    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <View style={styles.card}>
                    <LinearGradient
                        colors={[COLORS.gradStart, COLORS.gradEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGrad}
                    >
                        {/* Dismiss → auto-create a default employee (dismissWithAutoEmployee). */}
                        <TouchableOpacity
                            onPress={dismissWithAutoEmployee}
                            disabled={busy}
                            activeOpacity={0.7}
                            accessibilityLabel="Skip and set me up automatically"
                            style={[styles.closeBtn, busy && { opacity: 0.6 }]}
                        >
                            {autoAdding ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="close" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                        <View style={styles.eyebrowRow}>
                            <Ionicons name="sparkles" size={16} color="#fff" />
                            <Text style={styles.eyebrow}>HAPPY ONBOARDING</Text>
                        </View>
                        <Text style={[styles.headerTitle, { paddingRight: 36 }]}>Let’s add your first employee</Text>
                        <Text style={styles.headerSub}>
                            Create a default employee to continue. Your calendar, earnings and reports
                            are organised per employee — you can add more and switch later.
                        </Text>
                    </LinearGradient>

                    <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>EMPLOYEE NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Tesco PLC"
                            placeholderTextColor={COLORS.outline}
                            value={form.employerName}
                            onChangeText={(t) => setForm({ ...form, employerName: t })}
                        />
                        <Text style={[styles.label, { marginTop: 14 }]}>STORE / LOCATION</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. High Street"
                            placeholderTextColor={COLORS.outline}
                            value={form.store}
                            onChangeText={(t) => setForm({ ...form, store: t })}
                        />
                        <Text style={[styles.label, { marginTop: 14 }]}>NOTES (OPTIONAL)</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            multiline
                            placeholder="Anything to remember…"
                            placeholderTextColor={COLORS.outline}
                            value={form.notes}
                            onChangeText={(t) => setForm({ ...form, notes: t })}
                        />

                        <TouchableOpacity onPress={submit} disabled={busy} activeOpacity={0.85} style={{ marginTop: 20 }}>
                            <LinearGradient
                                colors={[COLORS.gradStart, COLORS.gradEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.cta, busy && { opacity: 0.7 }]}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="sparkles" size={16} color="#fff" />
                                )}
                                <Text style={styles.ctaText}>
                                    {saving ? 'CREATING…' : 'CREATE DEFAULT EMPLOYEE'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Escape hatch — mirrors the header "X". */}
                        <TouchableOpacity onPress={dismissWithAutoEmployee} disabled={busy} activeOpacity={0.7} style={styles.skipBtn}>
                            <Text style={styles.skipText}>
                                {autoAdding ? 'Setting you up…' : 'Skip — set me up automatically'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.55)' },
    card: { width: '100%', maxWidth: 440, backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, overflow: 'hidden', maxHeight: '88%' },
    headerGrad: { padding: 20 },
    closeBtn: {
        position: 'absolute', top: 14, right: 14, zIndex: 2,
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    skipBtn: { marginTop: 14, marginBottom: 4, paddingVertical: 8, alignItems: 'center' },
    skipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurfaceVar },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    eyebrow: { fontSize: 11, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
    headerTitle: { fontSize: 22, fontFamily: FONTS.bold, color: '#fff', marginBottom: 6 },
    headerSub: { fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
    body: { padding: 20 },
    label: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    input: { backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    textarea: { height: 64, textAlignVertical: 'top' },
    cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: RADIUS.md },
    ctaText: { fontSize: 12, fontFamily: FONTS.bold, color: '#fff', letterSpacing: 0.8 },
});
