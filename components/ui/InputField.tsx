import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

interface Props extends TextInputProps {
    label: string;
    icon?: string;
    isPassword?: boolean;
    error?: string;
    rightElement?: React.ReactNode;
}

export default function InputField({ label, icon, isPassword, error, rightElement, ...props }: Props) {
    const [secure, setSecure] = useState(isPassword ?? false);
    const [focused, setFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
            <View style={[styles.wrap, focused && styles.wrapFocused, !!error && styles.wrapError]}>
                {icon && <Ionicons name={icon as any} size={16} color={focused ? COLORS.primary : COLORS.outline} style={styles.icon} />}
                <TextInput
                    {...props}
                    secureTextEntry={secure}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={styles.input}
                    placeholderTextColor={COLORS.outline}
                />
                {isPassword && (
                    <TouchableOpacity onPress={() => setSecure(v => !v)} style={styles.eye}>
                        <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={16} color={COLORS.outline} />
                    </TouchableOpacity>
                )}
                {rightElement}
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 14 },
    label: {
        fontSize: 11, fontFamily: FONTS.bold,
        letterSpacing: 0.8, color: COLORS.onSurfaceVar, marginBottom: 6,
    },
    wrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surfaceContainer,
        borderWidth: 1.5, borderColor: COLORS.outlineVar,
        borderRadius: RADIUS.md, paddingHorizontal: 12, height: 50,
    },
    wrapFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLowest },
    wrapError:   { borderColor: COLORS.error },
    icon:        { marginRight: 8 },
    input: {
        flex: 1, fontSize: 14,
        fontFamily: FONTS.regular, color: COLORS.onSurface,
    },
    eye:       { padding: 4, marginLeft: 4 },
    errorText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.error, marginTop: 4 },
});
