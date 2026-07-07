import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/theme';

// Small status/type pill. Pass explicit fg/bg colours (screens map status → colour).
export default function Badge({
    label,
    color,
    bg,
}: {
    label: string;
    color: string;
    bg: string;
}) {
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.text, { color }]}>{label.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 9,
        fontFamily: FONTS.bold,
        letterSpacing: 0.6,
    },
});
