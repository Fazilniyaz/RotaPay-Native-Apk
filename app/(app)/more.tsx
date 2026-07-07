import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { logoutThunk } from '../../store/slices/authSlice';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import { getShiftAnalytics, ShiftAnalytics } from '../../lib/services/shifts';
import { money } from '../../lib/format';

const MENU_ITEMS: { icon: string; color: string; label: string; route: string }[][] = [
    [
        { icon: 'time-outline', color: COLORS.secondary, label: 'Clock', route: '/(app)/clock' },
        { icon: 'calendar-outline', color: '#7c3aed', label: 'Calendar', route: '/(app)/calendar' },
        { icon: 'briefcase-outline', color: COLORS.primary, label: 'Employers', route: '/(app)/employers' },
        { icon: 'bar-chart-outline', color: '#0891b2', label: 'Reports', route: '/(app)/reports' },
        { icon: 'notifications-outline', color: COLORS.gradStart, label: 'Notifications', route: '/(app)/notifications' },
    ],
    [
        { icon: 'settings-outline', color: COLORS.outline, label: 'Settings', route: '/(app)/settings' },
    ],
];

export default function MoreScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((s: RootState) => s.auth);
    const settings = useSelector((s: RootState) => s.settings);
    const unread = useSelector((s: RootState) => s.notifications.unread);

    const [analytics, setAnalytics] = useState<ShiftAnalytics | null>(null);

    useEffect(() => {
        getShiftAnalytics().then(setAnalytics).catch(() => {});
    }, []);

    const name = settings.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
    const email = settings.email || user?.email;
    const photo = settings.profilePicture;

    const handleLogout = async () => {
        await dispatch(logoutThunk());
        router.replace('/(auth)/login');
    };

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader title="More" subtitle="MORE OPTIONS" rightAction={<View style={{ width: 38 }} />} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile banner */}
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileBanner}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarCircle} />
                    ) : (
                        <View style={styles.avatarCircle}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.bannerName}>{name}</Text>
                        <Text style={styles.bannerEmail}>{email}</Text>
                    </View>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/(app)/settings' as any)}>
                        <Ionicons name="pencil" size={14} color="#fff" />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Stats row (real analytics) */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{analytics ? `${Math.round(analytics.totalHours)}h` : '—'}</Text>
                        <Text style={styles.statLbl}>Total Hours</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{analytics ? `${Math.round(analytics.thisMonthHours)}h` : '—'}</Text>
                        <Text style={styles.statLbl}>This Month</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statVal, { color: COLORS.secondary }]}>{analytics ? money(analytics.totalPay) : '—'}</Text>
                        <Text style={styles.statLbl}>Total Pay</Text>
                    </View>
                </View>

                {/* Menu groups */}
                {MENU_ITEMS.map((group, gi) => (
                    <View key={gi} style={styles.menuCard}>
                        {group.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[styles.menuRow, i < group.length - 1 && styles.menuBorder]}
                                onPress={() => router.push(item.route as any)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                                </View>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                {item.label === 'Notifications' && unread > 0 && (
                                    <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>
                                )}
                                <Ionicons name="chevron-forward" size={16} color={COLORS.outline} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                    <Text style={styles.logoutText}>LOG OUT</Text>
                </TouchableOpacity>

                {/* Version */}
                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>RotoPay</Text>
                    <Text style={styles.footerVer}>Version 1.0.0</Text>
                </View>

            </ScrollView>
            <BottomNav active="more" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    content: { padding: 16, paddingBottom: 16 },

    profileBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl, padding: 16, gap: 12, marginBottom: 14, ...SHADOW.button },
    avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontFamily: FONTS.bold, color: '#fff' },
    bannerName: { fontSize: 16, fontFamily: FONTS.bold, color: '#fff', marginBottom: 2 },
    bannerEmail: { fontSize: 11, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.8)' },
    editProfileBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: { flex: 1, backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.outlineVar + '30' },
    statVal: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 2 },
    statLbl: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.3 },

    menuCard: { backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.outlineVar + '30', overflow: 'hidden', ...SHADOW.card, marginBottom: 12 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.outlineVar + '20' },
    menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    badge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
    badgeText: { fontSize: 10, fontFamily: FONTS.bold, color: '#fff' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(186,26,26,0.3)', borderRadius: RADIUS.md, marginBottom: 16 },
    logoutText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.error, letterSpacing: 0.8 },

    footer: { alignItems: 'center', paddingTop: 8 },
    footerBrand: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 2 },
    footerVer: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },
});
