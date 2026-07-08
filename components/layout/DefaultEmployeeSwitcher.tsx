import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setDefaultEmployerThunk } from '../../store/slices/dataSlice';
import { Modal } from '../ui/Modal';
import { notify } from '../../lib/toast';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

// Native equivalent of the web sidebar's default-employee switcher. A slim bar
// (rendered under AppHeader on every screen) shows the current default employee;
// tapping it opens a picker to switch. Switching re-scopes calendar / earnings /
// reports app-wide (setDefaultEmployerThunk).
const initialsOf = (name: string) =>
    name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export default function DefaultEmployeeSwitcher() {
    const dispatch = useDispatch<AppDispatch>();
    const employers = useSelector((s: RootState) => s.data.employers);
    const defaultEmployerId = useSelector((s: RootState) => s.data.defaultEmployerId);

    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState<string | null>(null);

    // The onboarding gate covers the zero-employee case; nothing to switch then.
    if (employers.length === 0) return null;

    const current = employers.find((e) => e.id === defaultEmployerId) ?? employers[0];

    const pick = async (id: string) => {
        if (id === defaultEmployerId || switching) return;
        const emp = employers.find((e) => e.id === id);
        setSwitching(id);
        try {
            await dispatch(setDefaultEmployerThunk(id)).unwrap();
            notify('Default updated', `Now showing ${emp?.employerName}`);
            setOpen(false);
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Could not switch employee');
        } finally {
            setSwitching(null);
        }
    };

    return (
        <>
            <TouchableOpacity style={styles.bar} activeOpacity={0.75} onPress={() => setOpen(true)}>
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsOf(current.employerName)}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                    <Text style={styles.caption}>DEFAULT EMPLOYEE</Text>
                    <Text style={styles.name} numberOfLines={1}>{current.employerName}</Text>
                </View>
                <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                <Text style={styles.change}>CHANGE</Text>
            </TouchableOpacity>

            <Modal open={open} onClose={() => setOpen(false)} title="Switch default employee">
                <Text style={styles.hint}>
                    The default employee scopes your calendar, earnings and reports.
                </Text>
                {employers.map((emp) => {
                    const isCurrent = emp.id === defaultEmployerId;
                    return (
                        <TouchableOpacity
                            key={emp.id}
                            style={[styles.row, isCurrent && styles.rowActive]}
                            activeOpacity={0.7}
                            onPress={() => pick(emp.id)}
                            disabled={!!switching}
                        >
                            <View style={styles.rowInitial}>
                                <Text style={styles.rowInitialText}>{initialsOf(emp.employerName)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowName} numberOfLines={1}>{emp.employerName}</Text>
                                <Text style={styles.rowStore} numberOfLines={1}>{emp.store}</Text>
                            </View>
                            {switching === emp.id ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : isCurrent ? (
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: COLORS.surfaceLowest,
        paddingHorizontal: 16, paddingVertical: 9,
        borderBottomWidth: 1, borderBottomColor: COLORS.outlineVar,
    },
    avatar: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff' },
    caption: { fontSize: 8, fontFamily: FONTS.bold, letterSpacing: 0.7, color: COLORS.outline },
    name: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.onSurface, marginTop: 1 },
    change: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5, color: COLORS.primary },

    hint: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline, marginBottom: 12 },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md,
        padding: 11, marginBottom: 10,
    },
    rowActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(58,146,149,0.04)' },
    rowInitial: {
        width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(58,146,149,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    rowInitialText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
    rowName: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    rowStore: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline, marginTop: 1 },
});
