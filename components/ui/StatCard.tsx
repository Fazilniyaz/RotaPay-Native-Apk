import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';

// Dashboard stat tile — label, mono value, gradient icon bubble, optional trend.
// Mirrors the web app's `.rp-stat-card`.
export default function StatCard({
    title,
    value,
    icon,
    change,
    trend = 'neutral',
    sub,
}: {
    title: string;
    value: string;
    icon: string;
    change?: number | null;
    trend?: 'up' | 'down' | 'neutral';
    sub?: string;
}) {
    const up = trend === 'up';
    const down = trend === 'down';
    const trendColor = up ? '#001b48' : down ? '#ba1a1a' : COLORS.primary;

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{title.toUpperCase()}</Text>
                    <Text style={styles.value} numberOfLines={1}>
                        {value}
                    </Text>
                </View>
                <LinearGradient
                    colors={[COLORS.gradStart, COLORS.gradEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBubble}
                >
                    <Ionicons name={icon as any} size={18} color="#fff" />
                </LinearGradient>
            </View>
            <View style={styles.trendRow}>
                {(up || down) && (
                    <Ionicons name={up ? 'trending-up' : 'trending-down'} size={13} color={trendColor} />
                )}
                {change != null && <Text style={[styles.change, { color: trendColor }]}>{change}%</Text>}
                {sub ? <Text style={styles.sub}>{sub}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: COLORS.surfaceLowest,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(2,69,122,0.08)',
        padding: 16,
        ...SHADOW.card,
    },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
    label: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.outline, marginBottom: 4 },
    value: { fontSize: 19, fontFamily: FONTS.bold, color: COLORS.primary },
    iconBubble: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    change: { fontSize: 12, fontFamily: FONTS.semiBold },
    sub: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },
});
