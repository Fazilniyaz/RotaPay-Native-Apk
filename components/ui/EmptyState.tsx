import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import Button from './Button';

// Centered empty placeholder — icon bubble, title, hint, optional action button.
export default function EmptyState({
    icon,
    title,
    subtitle,
    actionLabel,
    onAction,
}: {
    icon: string;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <View style={styles.wrap}>
            <View style={styles.bubble}>
                <Ionicons name={icon as any} size={40} color={COLORS.outlineVar} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {actionLabel && onAction ? (
                <Button title={actionLabel} onPress={onAction} style={{ marginTop: 20, minWidth: 200 }} />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    bubble: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 6, textAlign: 'center' },
    subtitle: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.outline,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 19,
    },
});
