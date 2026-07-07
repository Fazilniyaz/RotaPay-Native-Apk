import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';

interface Props {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    variant?: 'primary' | 'outline' | 'ghost';
}

export default function Button({ title, onPress, loading, disabled, style, variant = 'primary' }: Props) {
    if (variant === 'outline') {
        return (
            <TouchableOpacity
                onPress={onPress} disabled={disabled || loading}
                style={[styles.outline, style]} activeOpacity={0.7}
            >
                {loading
                    ? <ActivityIndicator color={COLORS.primary} size="small" />
                    : <Text style={styles.outlineText}>{title}</Text>
                }
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress} disabled={disabled || loading}
            activeOpacity={0.85}
            style={[{ borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.button }, style]}
        >
            <LinearGradient
                colors={[COLORS.gradStart, COLORS.gradEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.gradient, (disabled || loading) && { opacity: 0.6 }]}
            >
                {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.text}>{title}</Text>
                }
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    gradient: {
        paddingVertical: 15, paddingHorizontal: 24,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: RADIUS.md,
    },
    text: { color: '#fff', fontSize: 15, fontFamily: FONTS.bold, letterSpacing: 0.2 },
    outline: {
        borderWidth: 1.5, borderColor: COLORS.outlineVar,
        borderRadius: RADIUS.md, paddingVertical: 13,
        alignItems: 'center', backgroundColor: 'transparent',
    },
    outlineText: { color: COLORS.primary, fontSize: 14, fontFamily: FONTS.semiBold },
});
