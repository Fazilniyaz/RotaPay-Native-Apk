import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

type Tab = 'home' | 'shifts' | 'clock' | 'more';

const TABS: { key: Tab; label: string; icon: string; activeIcon: string; route: string }[] = [
    { key: 'home',   label: 'Home',   icon: 'home-outline',      activeIcon: 'home',      route: '/(app)/dashboard' },
    { key: 'shifts', label: 'Shifts', icon: 'calendar-outline',  activeIcon: 'calendar',  route: '/(app)/shifts' },
    { key: 'clock',  label: 'Clock',  icon: 'time-outline',      activeIcon: 'time',      route: '/(app)/clock' },
    { key: 'more',   label: 'More',   icon: 'grid-outline',      activeIcon: 'grid',      route: '/(app)/more' },
];

export default function BottomNav({ active }: { active: Tab }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
            {TABS.map(tab => {
                const isActive = tab.key === active;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.tab}
                        onPress={() => router.replace(tab.route as any)}
                        activeOpacity={0.7}
                    >
                        {isActive ? (
                            <LinearGradient
                                colors={[COLORS.gradStart, COLORS.gradEnd]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.activePill}
                            >
                                <Ionicons name={tab.activeIcon as any} size={18} color="#fff" />
                                <Text style={styles.activeLabel}>{tab.label}</Text>
                            </LinearGradient>
                        ) : (
                            <>
                                <Ionicons name={tab.icon as any} size={22} color={COLORS.outline} />
                                <Text style={styles.inactiveLabel}>{tab.label}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: COLORS.outlineVar + '40',
        paddingTop: 8,
        paddingHorizontal: 8,
    },
    tab: {
        flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4,
    },
    activePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: RADIUS.full,
    },
    activeLabel:   { fontSize: 12, fontFamily: FONTS.bold, color: '#fff' },
    inactiveLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.outline, marginTop: 2 },
});
