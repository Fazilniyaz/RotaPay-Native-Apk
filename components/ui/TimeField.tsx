import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

// A "HH:mm" time field backed by the native time picker.
export default function TimeField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string; // "HH:mm"
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);

    const [h, m] = value.split(':').map((n) => parseInt(n, 10));
    const date = new Date();
    date.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);

    // On web the native picker (@react-native-community/datetimepicker) is a no-op,
    // which made Start/End time unchangeable. Mirror the Admin web app and render a
    // real HTML <input type="time"> — identical behaviour, keyboard + native picker.
    if (Platform.OS === 'web') {
        return (
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>{label.toUpperCase()}</Text>
                {React.createElement('input', {
                    type: 'time',
                    value,
                    onChange: (e: any) => onChange(e.target.value),
                    style: {
                        width: '100%',
                        height: 50,
                        boxSizing: 'border-box',
                        backgroundColor: COLORS.surfaceContainer,
                        border: `1.5px solid ${COLORS.outlineVar}`,
                        borderRadius: RADIUS.md,
                        padding: '0 12px',
                        fontSize: 14,
                        fontFamily: FONTS.medium,
                        color: COLORS.onSurface,
                        outline: 'none',
                    },
                })}
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.label}>{label.toUpperCase()}</Text>
            <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
                <Text style={styles.value}>{value || '--:--'}</Text>
                <Ionicons name="time-outline" size={16} color={COLORS.outline} />
            </TouchableOpacity>
            {open && (
                <DateTimePicker
                    value={date}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                    onChange={(event, selected) => {
                        // Android fires once with the chosen value (or dismissed).
                        if (Platform.OS !== 'ios') setOpen(false);
                        if (event.type === 'dismissed' || !selected) return;
                        const hh = String(selected.getHours()).padStart(2, '0');
                        const mm = String(selected.getMinutes()).padStart(2, '0');
                        onChange(`${hh}:${mm}`);
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
    value: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.onSurface },
    done: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
    doneText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.primary },
});
