import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

// A "YYYY-MM-DD" date field backed by the native date picker.
export default function DateField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string; // "YYYY-MM-DD"
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const date = value ? new Date(`${value}T12:00:00`) : new Date();

    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.label}>{label.toUpperCase()}</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
                <Text style={styles.value}>{value || 'Pick a date'}</Text>
                <Ionicons name="calendar-outline" size={16} color={COLORS.outline} />
            </TouchableOpacity>
            {open && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                    onChange={(event, selected) => {
                        if (Platform.OS !== 'ios') setOpen(false);
                        if (event.type === 'dismissed' || !selected) return;
                        const y = selected.getFullYear();
                        const m = String(selected.getMonth() + 1).padStart(2, '0');
                        const d = String(selected.getDate()).padStart(2, '0');
                        onChange(`${y}-${m}-${d}`);
                    }}
                />
            )}
            {Platform.OS === 'ios' && open && (
                <TouchableOpacity onPress={() => setOpen(false)} style={styles.done}>
                    <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    field: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar,
        borderRadius: RADIUS.md, paddingHorizontal: 12, height: 50,
    },
    value: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.onSurface },
    done: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
    doneText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
});
