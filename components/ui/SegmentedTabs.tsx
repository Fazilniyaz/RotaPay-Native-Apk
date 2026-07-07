import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

export interface TabOption<T extends string> {
    value: T;
    label: string;
}

// Horizontal pill filter bar — active pill uses the brand gradient (matches the
// web app's shift/earnings filter chips).
export default function SegmentedTabs<T extends string>({
    options,
    value,
    onChange,
}: {
    options: TabOption<T>[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
        >
            {options.map((opt) => {
                const active = opt.value === value;
                if (active) {
                    return (
                        <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} activeOpacity={0.85}>
                            <LinearGradient
                                colors={[COLORS.gradStart, COLORS.gradEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.pill}
                            >
                                <Text style={styles.activeText}>{opt.label}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    );
                }
                return (
                    <TouchableOpacity
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={[styles.pill, styles.inactive]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.inactiveText}>{opt.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    row: { gap: 8, paddingRight: 8 },
    pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.sm },
    inactive: { backgroundColor: COLORS.surfaceContainer },
    activeText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff', letterSpacing: 0.5 },
    inactiveText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.5 },
});
