import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { loadAllData } from '../../store/slices/dataSlice';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import BarChart from '../../components/charts/BarChart';
import DonutChart, { DonutSegment } from '../../components/charts/DonutChart';
import { Shift } from '../../lib/types';
import { money, fmtDateShort, fmtTime, timeAgo } from '../../lib/format';
import { activityMeta } from '../../lib/activityMeta';

// Vibrant per-hue gradients (electric blue · cyan · violet).
const GRAD = {
    blue: ['#2563eb', '#1d4ed8'] as [string, string],
    blueCyan: ['#2563eb', '#06b6d4'] as [string, string],
    violet: ['#7c3aed', '#8b5cf6'] as [string, string],
    cyan: ['#06b6d4', '#0891b2'] as [string, string],
};

const QUICK_ACTIONS = [
    { icon: 'time-outline', label: 'Clock In', route: '/(app)/clock', grad: GRAD.blue },
    { icon: 'add-outline', label: 'Add Shift', route: '/(app)/shifts', grad: GRAD.blueCyan },
    { icon: 'document-text-outline', label: 'Reports', route: '/(app)/reports', grad: GRAD.violet },
    { icon: 'briefcase-outline', label: 'Employers', route: '/(app)/employers', grad: GRAD.cyan },
];

const DONUT_COLORS = ['#2563eb', '#06b6d4', '#7c3aed', '#0ea5e9', '#8b5cf6', '#7dd3fc'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const shiftEarnings = (s: Shift) => (s.salaries ?? []).reduce((sum, w) => sum + (w.salary ?? 0), 0);

function startOfWeek(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const offset = (x.getDay() + 6) % 7; // Mon = 0 … Sun = 6
    x.setDate(x.getDate() - offset);
    return x;
}

function trendFrom(cur: number, prev: number): { change: number | null; trend: 'up' | 'down' | 'neutral' } {
    if (prev === 0) return cur > 0 ? { change: 100, trend: 'up' } : { change: null, trend: 'neutral' };
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { change: Math.abs(pct), trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' };
}

export default function DashboardScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((s: RootState) => s.auth);
    const settings = useSelector((s: RootState) => s.settings);
    const { items: notifications, loaded: notesLoaded } = useSelector((s: RootState) => s.notifications);

    // Read every figure from the shared preloaded cache — instant on tab switch.
    const shifts = useSelector((s: RootState) => s.data.shifts);
    const calendar = useSelector((s: RootState) => s.data.calendar);
    const employers = useSelector((s: RootState) => s.data.employers);
    const loaded = useSelector((s: RootState) => s.data.loaded);
    const loading = !loaded;

    const assignments = calendar.filter((e) => e.type === 'shift' && e.shiftId);
    const activeEmployers = employers.filter((e) => e.isActive).length;

    // Fill the cache if the user landed here before the layout preload ran.
    useEffect(() => { dispatch(loadAllData()); }, [dispatch]);

    const name = settings.displayName || user?.displayName || user?.email?.split('@')[0] || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    // ── Derivations (mirror the web dashboard) ──
    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const inRange = (d: Date, from: Date, to: Date) => d >= from && d < to;

    // Each assignment (a preset put on a day) is a worked occurrence.
    const shiftById = new Map(shifts.map((s) => [s.id, s]));
    const occurrences = assignments.map((e) => {
        const s = e.shiftId ? shiftById.get(e.shiftId) : undefined;
        return {
            date: new Date(e.date),
            hours: s?.totalHours ?? e.shift?.totalHours ?? 0,
            earned: (s?.salaries ?? []).reduce((a, w) => a + (w.salary ?? 0), 0),
            employer: s?.employer?.employerName || s?.shiftName || s?.shiftType || 'Shift',
            startTime: s?.startTime,
            endTime: s?.endTime,
            id: e.id,
        };
    });

    const earnThisMonth = occurrences.filter((o) => inRange(o.date, monthStart, now)).reduce((a, o) => a + o.earned, 0);
    const earnLastMonth = occurrences.filter((o) => inRange(o.date, lastMonthStart, monthStart)).reduce((a, o) => a + o.earned, 0);
    const hoursThisWeek = occurrences.filter((o) => inRange(o.date, weekStart, now)).reduce((a, o) => a + o.hours, 0);
    const hoursLastWeek = occurrences.filter((o) => inRange(o.date, lastWeekStart, weekStart)).reduce((a, o) => a + o.hours, 0);
    const upcomingOcc = occurrences.filter((o) => o.date > now);
    const monthTrend = trendFrom(earnThisMonth, earnLastMonth);
    const weekTrend = trendFrom(hoursThisWeek, hoursLastWeek);

    const weekBars = WEEKDAYS.map((day, i) => {
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const amount = occurrences.filter((o) => inRange(o.date, dayStart, dayEnd)).reduce((a, o) => a + o.earned, 0);
        return { day, amount };
    });
    const weekTotal = weekBars.reduce((a, b) => a + b.amount, 0);

    const totalEarned = shifts.reduce((a, s) => a + shiftEarnings(s), 0);
    const byEmployer = new Map<string, number>();
    for (const s of shifts) {
        for (const w of s.salaries ?? []) {
            const nm = w.employer?.employerName ?? 'Unassigned';
            byEmployer.set(nm, (byEmployer.get(nm) ?? 0) + (w.salary ?? 0));
        }
    }
    const sorted = [...byEmployer.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const topEmployers = sorted.slice(0, 5);
    const otherTotal = sorted.slice(5).reduce((a, [, v]) => a + v, 0);
    const donutSegments: DonutSegment[] = [
        ...topEmployers.map(([label, v], i) => ({ label, color: DONUT_COLORS[i % DONUT_COLORS.length], pct: totalEarned > 0 ? Math.round((v / totalEarned) * 100) : 0 })),
        ...(otherTotal > 0 ? [{ label: 'Other', color: DONUT_COLORS[5], pct: Math.round((otherTotal / totalEarned) * 100) }] : []),
    ];

    const upcomingRows = [...upcomingOcc]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 4)
        .map((o) => ({
            id: o.id,
            employer: o.employer,
            date: fmtDateShort(o.date.toISOString()),
            time: o.startTime && o.endTime ? `${fmtTime(o.startTime)} – ${fmtTime(o.endTime)}` : '—',
        }));

    const activities = notifications.slice(0, 6);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader title="Dashboard" subtitle="OVERVIEW" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Greeting */}
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.greetCard}>
                    <Text style={styles.greetText}>{greeting}, {name}! 👋</Text>
                    <Text style={styles.greetDate}>{today}</Text>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.actionsGrid}>
                    {QUICK_ACTIONS.map((a) => (
                        <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.route as any)} activeOpacity={0.85}>
                            <LinearGradient colors={a.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGrad}>
                                <Ionicons name={a.icon as any} size={22} color="#fff" />
                                <Text style={styles.actionLabel}>{a.label}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Stats */}
                        <View style={styles.statsGrid}>
                            <StatCard title="This Month" value={money(earnThisMonth)} icon="wallet-outline" change={monthTrend.change} trend={monthTrend.trend} sub="vs last month" gradient={GRAD.blue} />
                            <StatCard title="This Week" value={`${Math.round(hoursThisWeek * 10) / 10}h`} icon="time-outline" change={weekTrend.change} trend={weekTrend.trend} sub="vs last week" gradient={GRAD.cyan} />
                        </View>
                        <View style={styles.statsGrid}>
                            <StatCard title="Upcoming" value={String(upcomingOcc.length)} icon="calendar-outline" sub="scheduled" gradient={GRAD.violet} />
                            <StatCard title="Employers" value={String(activeEmployers)} icon="business-outline" sub="active" gradient={GRAD.blueCyan} />
                        </View>

                        {/* Weekly earnings chart */}
                        <Card style={{ marginTop: 4 }}>
                            <Text style={styles.cardTitle}>This Week&apos;s Earnings</Text>
                            <BarChart bars={weekBars} />
                            <View style={styles.chartFooter}>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>WEEKLY TOTAL</Text>
                                    <Text style={[styles.footerVal, { color: COLORS.primary }]}>{money(weekTotal)}</Text>
                                </View>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>THIS MONTH</Text>
                                    <Text style={styles.footerVal}>{money(earnThisMonth)}</Text>
                                </View>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>HRS / WEEK</Text>
                                    <Text style={[styles.footerVal, { color: COLORS.secondary }]}>{Math.round(hoursThisWeek * 10) / 10}h</Text>
                                </View>
                            </View>
                        </Card>

                        {/* Salary overview donut */}
                        <Card style={{ marginTop: 16 }}>
                            <Text style={styles.cardTitle}>Salary Overview</Text>
                            {donutSegments.length === 0 ? (
                                <Text style={styles.emptyNote}>No earnings recorded yet.</Text>
                            ) : (
                                <View style={styles.donutRow}>
                                    <DonutChart segments={donutSegments} centerValue={money(totalEarned)} />
                                    <View style={styles.donutLegend}>
                                        {donutSegments.map((seg) => (
                                            <View key={seg.label} style={styles.legendRow}>
                                                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                                                <Text style={styles.legendLabel} numberOfLines={1}>{seg.label}</Text>
                                                <Text style={styles.legendPct}>{seg.pct}%</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </Card>

                        {/* Upcoming shifts */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>UPCOMING SHIFTS</Text>
                            <TouchableOpacity onPress={() => router.push('/(app)/calendar' as any)}>
                                <Text style={styles.seeAll}>View Calendar</Text>
                            </TouchableOpacity>
                        </View>
                        <Card padding={0}>
                            {upcomingRows.length === 0 ? (
                                <Text style={[styles.emptyNote, { padding: 20 }]}>No upcoming shifts scheduled.</Text>
                            ) : (
                                upcomingRows.map((s, i) => (
                                    <View key={s.id} style={[styles.shiftRow, i < upcomingRows.length - 1 && styles.rowBorder]}>
                                        <View style={styles.shiftIcon}>
                                            <Ionicons name="briefcase-outline" size={16} color={COLORS.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.shiftEmployer} numberOfLines={1}>{s.employer}</Text>
                                            <Text style={styles.shiftMeta}>{s.date}</Text>
                                        </View>
                                        <Text style={styles.shiftTime}>{s.time}</Text>
                                    </View>
                                ))
                            )}
                        </Card>

                        {/* Recent activity */}
                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>RECENT ACTIVITY</Text>
                        <Card padding={0}>
                            {!notesLoaded ? (
                                <ActivityIndicator color={COLORS.primary} style={{ padding: 24 }} />
                            ) : activities.length === 0 ? (
                                <Text style={[styles.emptyNote, { padding: 20 }]}>No activity yet. Your actions will appear here.</Text>
                            ) : (
                                activities.map((act, i) => {
                                    const meta = activityMeta(act.type);
                                    return (
                                        <View key={act.id} style={[styles.activityRow, i < activities.length - 1 && styles.rowBorder]}>
                                            <View style={[styles.activityDot, { backgroundColor: meta.bg }]}>
                                                <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.activityText}>{act.message}</Text>
                                                <Text style={styles.activityTime}>{timeAgo(act.scheduledAt ?? act.createdAt)}</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                            <TouchableOpacity onPress={() => router.push('/(app)/notifications' as any)} style={styles.seeAllBtn}>
                                <Text style={styles.seeAllBtnText}>SEE ALL ACTIVITY</Text>
                            </TouchableOpacity>
                        </Card>
                    </>
                )}
            </ScrollView>
            <BottomNav active="home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24 },

    greetCard: { borderRadius: RADIUS.xl, padding: 18, marginBottom: 16, ...SHADOW.button },
    greetText: { fontSize: 18, fontFamily: FONTS.bold, color: '#fff', marginBottom: 3 },
    greetDate: { fontSize: 12, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.85)' },

    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    actionCard: { flexBasis: '47%', flexGrow: 1, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.card },
    actionGrad: { flexDirection: 'row', gap: 8, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#fff' },

    statsGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },

    cardTitle: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.onSurface, marginBottom: 16 },
    emptyNote: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.outline, textAlign: 'center', paddingVertical: 24 },

    chartFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(37,99,235,0.08)', marginTop: 16, paddingTop: 14 },
    footerItem: { alignItems: 'flex-start' },
    footerLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.5, marginBottom: 3 },
    footerVal: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onSurface },

    donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    donutLegend: { flex: 1, gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurface },
    legendPct: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.outline },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    sectionLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 1, marginBottom: 10 },
    seeAll: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.4 },

    rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(37,99,235,0.06)' },
    shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    shiftIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(37,99,235,0.07)', alignItems: 'center', justifyContent: 'center' },
    shiftEmployer: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface, marginBottom: 2 },
    shiftMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline },
    shiftTime: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.onSurfaceVar },

    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    activityDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    activityText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurface, marginBottom: 2 },
    activityTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline, letterSpacing: 0.3 },

    seeAllBtn: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(37,99,235,0.06)' },
    seeAllBtnText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.8 },
});
