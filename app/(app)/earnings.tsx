import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { COLORS, FONTS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { Shift, Salary, CalendarEntry } from '../../lib/types';
import { getShiftAnalytics, listShifts, ShiftAnalytics } from '../../lib/services/shifts';
import { listSalaries } from '../../lib/services/salaries';
import { listCalendar } from '../../lib/services/calendar';
import { getRate } from '../../lib/services/currency';
import { money, moneyIn, currencySymbol } from '../../lib/format';

const DONUT_COLORS = ['#0077cc', '#37D36B', '#008557', '#005ea3', '#7c3aed', '#b45309'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
}

// SVG donut (share per employer) — mirrors the Admin web app.
function Donut({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
    const r = 64;
    const c = 2 * Math.PI * r;
    let cum = 0;
    return (
        <Svg width={160} height={160} viewBox="0 0 160 160">
            <G transform="rotate(-90 80 80)">
                {segments.map((s, i) => {
                    const dash = (s.pct / 100) * c;
                    const off = c * (1 - cum / 100);
                    cum += s.pct;
                    return (
                        <Circle
                            key={i}
                            cx={80}
                            cy={80}
                            r={r}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={18}
                            strokeDasharray={`${dash} ${c - dash}`}
                            strokeDashoffset={off - c}
                        />
                    );
                })}
            </G>
        </Svg>
    );
}

function StatCard({ label, value, icon, caption }: { label: string; value: string; icon: string; caption?: string }) {
    return (
        <Card style={styles.statCard}>
            <View style={styles.statTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
                    {caption ? <Text style={styles.statCaption} numberOfLines={1}>{caption}</Text> : null}
                </View>
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.statIcon}>
                    <Ionicons name={icon as any} size={18} color="#fff" />
                </LinearGradient>
            </View>
        </Card>
    );
}

export default function EarningsScreen() {
    const settings = useSelector((s: RootState) => s.settings);
    const globalCode = settings.currency || 'GBP';
    const nativeCode = settings.nativeCurrency || globalCode;

    // Earnings follow the default employee (set in the Employees screen).
    const employers = useSelector((s: RootState) => s.data.employers);
    const defaultEmployerId = useSelector((s: RootState) => s.data.defaultEmployerId);
    const defaultEmployer = employers.find((e) => e.id === defaultEmployerId) ?? null;

    const [analytics, setAnalytics] = useState<ShiftAnalytics | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [weekAssignments, setWeekAssignments] = useState<CalendarEntry[]>([]);
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [native, setNative] = useState<{ pay: number | null; rate: number | null }>({ pay: null, rate: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoading(true);
                const ws = startOfWeek(new Date());
                const we = new Date(ws); we.setDate(we.getDate() + 7);
                const [a, s, sal, cal] = await Promise.all([
                    // Scoped to the default employee.
                    getShiftAnalytics(defaultEmployerId ?? undefined),
                    listShifts({ limit: 500 }),
                    listSalaries({ limit: 500 }),
                    listCalendar({ from: ws.toISOString(), to: we.toISOString(), employerId: defaultEmployerId ?? undefined }),
                ]);
                if (!active) return;
                setAnalytics(a);
                setShifts(s.data);
                setSalaries(sal.data);
                setWeekAssignments(cal.filter((e) => e.type === 'shift'));

                // Native Pay is the conversion of "This Month Pay" (monthly salary).
                if (nativeCode === globalCode) {
                    setNative({ pay: a.thisMonthPay, rate: 1 });
                } else {
                    try {
                        const r = await getRate(globalCode, nativeCode);
                        if (active) setNative({ pay: a.thisMonthPay * r.rate, rate: r.rate });
                    } catch {
                        if (active) setNative({ pay: null, rate: null });
                    }
                }
            } catch {
                if (active) notify('Error', 'Failed to load earnings');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [globalCode, nativeCode, defaultEmployerId]);

    // Weekly hours per weekday — from the shifts ASSIGNED to each day this week.
    const weekBars = useMemo(() => {
        const ws = startOfWeek(new Date());
        const hoursById = new Map(shifts.map((s) => [s.id, s.totalHours ?? 0]));
        return WEEKDAYS.map((day, i) => {
            const from = new Date(ws); from.setDate(from.getDate() + i);
            const to = new Date(from); to.setDate(to.getDate() + 1);
            const hours = weekAssignments
                .filter((e) => { const d = new Date(e.date); return d >= from && d < to; })
                .reduce((a, e) => a + (e.shiftId ? hoursById.get(e.shiftId) ?? e.shift?.totalHours ?? 0 : 0), 0);
            return { day, hours: Math.round(hours * 10) / 10 };
        });
    }, [shifts, weekAssignments]);
    const maxHours = Math.max(1, ...weekBars.map((b) => b.hours));

    // Earnings share per employer (donut).
    const donut = useMemo(() => {
        const by = new Map<string, number>();
        for (const s of salaries) {
            const name = s.employer?.employerName ?? 'Unassigned';
            by.set(name, (by.get(name) ?? 0) + (s.salary ?? 0));
        }
        const rows = [...by.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        const total = rows.reduce((a, [, v]) => a + v, 0);
        return {
            total,
            segments: rows.slice(0, 6).map(([label, v], i) => ({
                label,
                value: v,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
                pct: total > 0 ? Math.round((v / total) * 100) : 0,
            })),
        };
    }, [salaries]);

    const payItems = [
        { label: 'This Month Pay', value: analytics?.thisMonthPay ?? 0, native: false },
        { label: 'Total Pay', value: analytics?.totalPay ?? 0, native: false },
        { label: `Native (${nativeCode})`, value: native.pay ?? 0, native: true },
    ];
    const payMax = Math.max(1, ...payItems.map((i) => i.value));

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader title="Earnings" subtitle={defaultEmployer ? `${defaultEmployer.employerName.toUpperCase()}'S HOURS & PAY` : 'YOUR HOURS AND PAY AT A GLANCE'} rightAction={<View style={{ width: 38 }} />} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
                ) : (
                    <>
                        {/* Stat cards */}
                        <View style={styles.statGrid}>
                            <StatCard label="TOTAL HOURS" value={`${analytics?.totalHours ?? 0}h`} icon="time-outline" />
                            <StatCard label="THIS MONTH PAY" value={money(analytics?.thisMonthPay)} icon="calendar-outline" />
                            <StatCard label="TOTAL PAY" value={money(analytics?.totalPay)} icon="wallet-outline" />
                            <StatCard
                                label="NATIVE PAY"
                                value={native.pay == null ? '—' : moneyIn(nativeCode, native.pay)}
                                icon="cash-outline"
                                caption={native.rate == null ? 'Rate unavailable' : native.rate === 1 ? 'Same as global' : `1 ${globalCode} = ${native.rate.toFixed(2)} ${nativeCode}`}
                            />
                        </View>

                        {/* Weekly hours bar chart */}
                        <Card style={styles.block}>
                            <Text style={styles.blockTitle}>Hours This Week</Text>
                            <View style={styles.barChart}>
                                {weekBars.map((b) => (
                                    <View key={b.day} style={styles.barCol}>
                                        <Text style={styles.barVal}>{b.hours > 0 ? `${b.hours}h` : ''}</Text>
                                        <View style={styles.barTrack}>
                                            <LinearGradient
                                                colors={[COLORS.gradEnd, COLORS.primary]}
                                                style={[styles.barFill, {
                                                    height: `${b.hours > 0 ? Math.max(4, (b.hours / maxHours) * 100) : 2}%`,
                                                    opacity: b.hours > 0 ? 1 : 0.25,
                                                }]}
                                            />
                                        </View>
                                        <Text style={styles.barDay}>{b.day}</Text>
                                    </View>
                                ))}
                            </View>
                        </Card>

                        {/* Earnings by employer donut */}
                        <Card style={styles.block}>
                            <Text style={styles.blockTitle}>Earnings by Employer</Text>
                            {donut.segments.length === 0 ? (
                                <EmptyState icon="wallet-outline" title="No earnings recorded yet." subtitle="Assign wages to shifts to see your earnings breakdown." />
                            ) : (
                                <View style={styles.donutRow}>
                                    <Donut segments={donut.segments} />
                                    <View style={{ flex: 1, gap: 8 }}>
                                        {donut.segments.map((s) => (
                                            <View key={s.label} style={styles.legendRow}>
                                                <View style={styles.legendLeft}>
                                                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                                                    <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
                                                </View>
                                                <Text style={styles.legendVal}>{money(s.value)}</Text>
                                            </View>
                                        ))}
                                        <View style={styles.legendTotal}>
                                            <Text style={styles.legendTotalLabel}>Total</Text>
                                            <Text style={styles.legendTotalVal}>{money(donut.total)}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </Card>

                        {/* Pay overview bars */}
                        <Card style={styles.block}>
                            <Text style={styles.blockTitle}>Pay Overview</Text>
                            <View style={{ gap: 12 }}>
                                {payItems.map((i) => (
                                    <View key={i.label}>
                                        <View style={styles.payHead}>
                                            <Text style={styles.payLabel}>{i.label}</Text>
                                            <Text style={styles.payVal}>
                                                {i.native
                                                    ? `${currencySymbol(nativeCode)}${(Math.round(i.value * 100) / 100).toLocaleString()}`
                                                    : money(i.value)}
                                            </Text>
                                        </View>
                                        <View style={styles.payTrack}>
                                            <LinearGradient
                                                colors={[COLORS.gradStart, COLORS.gradEnd]}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                style={[styles.payFill, { width: `${Math.max(2, (i.value / payMax) * 100)}%` }]}
                                            />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Card>
                    </>
                )}
            </ScrollView>

            <BottomNav active="more" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    content: { padding: 16, paddingBottom: 24, gap: 14 },

    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: { width: '47%', flexGrow: 1 },
    statTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    statLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5, color: COLORS.outline, marginBottom: 6 },
    statValue: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.primary },
    statCaption: { fontSize: 9, fontFamily: FONTS.regular, color: COLORS.outline, marginTop: 4 },
    statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    block: {},
    blockTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 16 },

    barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 180 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 },
    barVal: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary, height: 12 },
    barTrack: { flex: 1, width: 30, justifyContent: 'flex-end' },
    barFill: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 3 },
    barDay: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5, color: COLORS.outline },

    donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurface, flexShrink: 1 },
    legendVal: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.outline },
    legendTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,94,163,0.08)', paddingTop: 8, marginTop: 4 },
    legendTotalLabel: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.onSurface },
    legendTotalVal: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },

    payHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    payLabel: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.outline },
    payVal: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.primary },
    payTrack: { height: 12, borderRadius: 6, backgroundColor: 'rgba(0,94,163,0.06)', overflow: 'hidden' },
    payFill: { height: '100%', borderRadius: 6 },
});
