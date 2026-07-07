import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { COLORS, FONTS } from '../../constants/theme';
import Logo from '../ui/Logo';
import DefaultEmployeeSwitcher from './DefaultEmployeeSwitcher';

interface Props {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    // The default-employee switcher bar under the header (on by default). Turn
    // off on screens where it isn't useful (e.g. Settings, Notifications).
    showEmployeeSwitcher?: boolean;
}

export default function AppHeader({ title, subtitle, showBack = false, rightAction, showEmployeeSwitcher = true }: Props) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useSelector((s: RootState) => s.auth);
    const settings = useSelector((s: RootState) => s.settings);

    const photo = settings.profilePicture || user?.profilePicture;
    const initial =
        settings.displayName?.[0]?.toUpperCase() ??
        user?.displayName?.[0]?.toUpperCase() ??
        user?.email?.[0]?.toUpperCase() ??
        'U';

    const defaultRight = (
        <TouchableOpacity
            onPress={() => router.push('/(app)/notifications' as any)}
            style={styles.iconBtn}
        >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
    );

    // Profile avatar → tap to open settings. Shows the photo when set, else the
    // user's initial.
    const avatar = (
        <TouchableOpacity onPress={() => router.push('/(app)/settings' as any)} style={styles.avatar} activeOpacity={0.8}>
            {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
            ) : (
                <Text style={styles.avatarText}>{initial}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <LinearGradient
                colors={[COLORS.gradStart, COLORS.gradEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.left}>
                    {showBack ? (
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.logoChip}>
                            <Logo size={28} />
                        </View>
                    )}
                </View>

                <View style={styles.center}>
                    {title  ? <Text style={styles.title}>{title}</Text>   : null}
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>

                <View style={styles.right}>
                    {rightAction !== undefined ? rightAction : defaultRight}
                    {avatar}
                </View>
            </LinearGradient>

            {showEmployeeSwitcher ? <DefaultEmployeeSwitcher /> : null}
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 14,
        gap: 12,
    },
    left:  { width: 40 },
    center: { flex: 1 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    logoChip: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    avatar: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%', borderRadius: 19 },
    avatarText: { fontSize: 16, fontFamily: FONTS.bold, color: '#fff' },
    title:    { fontSize: 18, fontFamily: FONTS.bold, color: '#fff' },
    subtitle: { fontSize: 11, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
});
