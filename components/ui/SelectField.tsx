import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal as RNModal, ScrollView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

export interface SelectOption {
    value: string;
    label: string;
}

// A dropdown replacement for RN — a pressable field that opens a bottom-sheet
// list of options. Mirrors the web app's <select> usage.
export default function SelectField({
    label,
    value,
    options,
    placeholder = 'Select…',
    onChange,
}: {
    label?: string;
    value: string;
    options: SelectOption[];
    placeholder?: string;
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const selected = options.find((o) => o.value === value);

    return (
        <View style={{ marginBottom: 2 }}>
            {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
            <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
                <Text style={[styles.value, !selected && { color: COLORS.outline }]} numberOfLines={1}>
                    {selected ? selected.label : placeholder}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.outline} />
            </TouchableOpacity>

            <RNModal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={styles.overlay}>
                    <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                        <View style={styles.grabber} />
                        {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
                        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                            {options.map((opt) => {
                                const active = opt.value === value;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={styles.option}
                                        onPress={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.optionText, active && { color: COLORS.primary, fontFamily: FONTS.bold }]}>
                                            {opt.label}
                                        </Text>
                                        {active && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </RNModal>
        </View>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceContainer,
        borderWidth: 1.5,
        borderColor: COLORS.outlineVar,
        borderRadius: RADIUS.md,
        paddingHorizontal: 12,
        height: 50,
    },
    value: { flex: 1, fontSize: 14, fontFamily: FONTS.medium, color: COLORS.onSurface, marginRight: 8 },
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: COLORS.surfaceLowest,
        borderTopLeftRadius: RADIUS.xxl,
        borderTopRightRadius: RADIUS.xxl,
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.outlineVar, alignSelf: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 8 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(37,99,235,0.06)',
    },
    optionText: { fontSize: 15, fontFamily: FONTS.medium, color: COLORS.onSurface },
});
