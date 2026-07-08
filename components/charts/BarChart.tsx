import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/theme';

// Weekly earnings bars (Mon–Sun). Mirrors the web dashboard's BarChart.
export default function BarChart({
    bars,
    height = 180,
}: {
    bars: { day: string; amount: number }[];
    height?: number;
}) {
    const max = Math.max(1, ...bars.map((b) => b.amount));
    const chartH = height - 26; // leave room for day labels

    return (
        <View>
            <View style={[styles.row, { height: chartH }]}>
                {bars.map((b) => {
                    const h = b.amount > 0 ? Math.max(4, (b.amount / max) * chartH) : 2;
                    return (
                        <View key={b.day} style={styles.col}>
                            <Svg width="60%" height={h} style={{ opacity: b.amount > 0 ? 1 : 0.25 }}>
                                <Defs>
                                    <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0" stopColor={COLORS.primary} />
                                        <Stop offset="1" stopColor={COLORS.primaryMid} />
                                    </SvgGradient>
                                </Defs>
                                <Rect x="0" y="0" width="100%" height={h} rx={4} fill="url(#barGrad)" />
                            </Svg>
                        </View>
                    );
                })}
            </View>
            <View style={styles.row}>
                {bars.map((b) => (
                    <View key={b.day} style={styles.col}>
                        <Text style={styles.dayLabel}>{b.day}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end' },
    col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    dayLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4, marginTop: 6 },
});
