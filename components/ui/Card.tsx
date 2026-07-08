import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

// Base surface card — mirrors the web app's `.rp-card` (white, rounded, hairline
// brand border, soft shadow).
export default function Card({
    children,
    style,
    padding = 20,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    padding?: number;
}) {
    return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surfaceLowest,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(2,69,122,0.08)',
        ...SHADOW.card,
    },
});
