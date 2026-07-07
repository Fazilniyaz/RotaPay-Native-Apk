import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/theme';

export interface DonutSegment {
    label: string;
    pct: number;
    color: string;
}

// Salary-overview donut — segments drawn as dash-offset circle strokes, with a
// centered total. Mirrors the web dashboard's DonutChart.
export default function DonutChart({
    segments,
    centerLabel,
    centerValue,
    size = 160,
}: {
    segments: DonutSegment[];
    centerLabel?: string;
    centerValue: string;
    size?: number;
}) {
    const stroke = 18;
    const r = (size - stroke) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;

    let cumulative = 0;

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
                {/* rotate -90° so segments start at 12 o'clock */}
                <G rotation={-90} origin={`${cx}, ${cy}`}>
                    {segments.map((seg, i) => {
                        const dash = (seg.pct / 100) * circumference;
                        const offset = -(cumulative / 100) * circumference;
                        cumulative += seg.pct;
                        return (
                            <Circle
                                key={i}
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth={stroke}
                                strokeDasharray={`${dash} ${circumference - dash}`}
                                strokeDashoffset={offset}
                            />
                        );
                    })}
                </G>
            </Svg>
            <View style={styles.center}>
                <Text style={styles.centerLabel}>{(centerLabel ?? 'Total').toUpperCase()}</Text>
                <Text style={styles.centerValue}>{centerValue}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.onSurfaceVar, letterSpacing: 0.8 },
    centerValue: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 2 },
});
