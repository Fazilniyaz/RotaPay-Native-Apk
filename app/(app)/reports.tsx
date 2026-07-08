import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import { Modal } from '../../components/ui/Modal';
import { listShifts } from '../../lib/services/shifts';
import { listCalendar } from '../../lib/services/calendar';
import { generateReport } from '../../lib/services/reports';
import { exportReport, ReportFormat } from '../../lib/reportExport';
import { Shift, CalendarEntry } from '../../lib/types';
import { money } from '../../lib/format';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Tab = 'weekly' | 'monthly' | 'yearly';
interface DayDatum { day: string; short: string; hours: number; earnings: number }
interface Datum { label: string; earnings: number; hours: number }
// A worked occurrence = a shift preset assigned to a day (with its hours + wage).
interface Occurrence { date: Date; hours: number; earned: number }

function startOfWeek(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
}
function pctChange(cur: number, prev: number): number {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
}
function buildWeekly(occ: Occurrence[], weekStart: Date): DayDatum[] {
    return DAY_NAMES.map((day, i) => {
        const from = new Date(weekStart); from.setDate(from.getDate() + i);
        const to = new Date(from); to.setDate(to.getDate() + 1);
        const ds = occ.filter((o) => o.date >= from && o.date < to);
        return {
            day, short: DAY_SHORT[i],
            hours: Math.round(ds.reduce((a, o) => a + o.hours, 0) * 10) / 10,
            earnings: Math.round(ds.reduce((a, o) => a + o.earned, 0) * 100) / 100,
        };
    });
}
function buildMonthly(occ: Occurrence[], now: Date): Datum[] {
    const out: Datum[] = [];
    for (let i = 5; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const ms = occ.filter((o) => o.date >= from && o.date < to);
        out.push({
            label: MONTH_SHORT[from.getMonth()],
            earnings: Math.round(ms.reduce((a, o) => a + o.earned, 0) * 100) / 100,
            hours: Math.round(ms.reduce((a, o) => a + o.hours, 0) * 10) / 10,
        });
    }
    return out;
}
function buildYearly(occ: Occurrence[]): Datum[] {
    const map = new Map<number, { earnings: number; hours: number }>();
    for (const o of occ) {
        const y = o.date.getFullYear();
        const e = map.get(y) ?? { earnings: 0, hours: 0 };
        e.earnings += o.earned; e.hours += o.hours;
        map.set(y, e);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({
        label: String(year),
        earnings: Math.round(v.earnings * 100) / 100,
        hours: Math.round(v.hours * 10) / 10,
    }));
}

const EXPORT_FORMATS: { value: ReportFormat; label: string; icon: string }[] = [
    { value: 'excel', label: 'Excel (.xlsx)', icon: 'grid-outline' },
    { value: 'csv', label: 'CSV (.csv)', icon: 'document-outline' },
    { value: 'pdf', label: 'PDF (.pdf)', icon: 'document-text-outline' },
];

function StatTile({ label, value, icon, trend, sub }: { label: string; value: string; icon: string; trend?: number; sub?: string }) {
    const up = (trend ?? 0) > 0, down = (trend ?? 0) < 0;
    return (
        <Card style={{ flex: 1 }} padding={14}>
            <View style={styles.tileTop}>
                <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.tileIcon}>
                    <Ionicons name={icon as any} size={15} color="#fff" />
                </LinearGradient>
            </View>
            <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
            {(trend !== undefined || sub) && (
                <View style={styles.tileTrendRow}>
                    {trend !== undefined && (
                        <View style={styles.tileTrend}>
                            <Ionicons name={up ? 'trending-up' : down ? 'trending-down' : 'remove'} size={12} color={up ? COLORS.secondary : down ? COLORS.error : COLORS.outline} />
                            <Text style={[styles.tileTrendText, { color: up ? COLORS.secondary : down ? COLORS.error : COLORS.outline }]}>{Math.abs(trend)}%</Text>
                        </View>
                    )}
                    {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
                </View>
            )}
        </Card>
    );
}

function Bars({ bars }: { bars: { label: string; pct: number; dim?: boolean }[] }) {
    return (
        <View style={styles.barsRow}>
            {bars.map((b) => (
                <View key={b.label} style={styles.barCol}>
                    <View style={styles.barTrack}>
                        <LinearGradient colors={[COLORS.gradEnd, COLORS.gradStart]} style={[styles.bar, { height: `${Math.max(4, b.pct)}%`, opacity: b.dim ? 0.3 : 1 }]} />
                    </View>
                    <Text style={styles.barLabel}>{b.label}</Text>
                </View>
            ))}
        </View>
    );
}

function DataRows({ rows }: { rows: { label: string; hours: number; earnings: number }[] }) {
    return (
        <View style={{ marginTop: 12 }}>
            {rows.map((r, i) => (
                <View key={r.label} style={[styles.dataRow, i < rows.length - 1 && styles.dataRowBorder]}>
                    <Text style={styles.dataLabel}>{r.label}</Text>
                    <Text style={styles.dataHours}>{r.hours}h</Text>
                    <Text style={[styles.dataEarn, { color: r.earnings > 0 ? COLORS.primary : COLORS.outlineVar }]}>{money(r.earnings)}</Text>
                </View>
            ))}
        </View>
    );
}

export default function ReportsScreen() {
    const [tab, setTab] = useState<Tab>('weekly');
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [assignments, setAssignments] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [exporting, setExporting] = useState<ReportFormat | null>(null);
    const reportMonths = useSelector((s: RootState) => s.settings.reportMonths);

    useEffect(() => {
        const from = new Date(); from.setFullYear(from.getFullYear() - 2);
        const to = new Date();
        Promise.all([
            listShifts({ limit: 1000 }),
            listCalendar({ from: from.toISOString(), to: to.toISOString() }),
        ])
            .then(([sh, cal]) => {
                setShifts(sh.data);
                setAssignments(cal.filter((e) => e.type === 'shift' && e.shiftId));
            })
            .catch(() => notify('Error', 'Failed to load report data'))
            .finally(() => setLoading(false));
    }, []);

    const { weekly, prevWeek, monthly, yearly } = useMemo(() => {
        const now = new Date();
        const weekStart = startOfWeek(now);
        const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const shiftById = new Map(shifts.map((s) => [s.id, s]));
        const occ: Occurrence[] = assignments.map((e) => {
            const s = e.shiftId ? shiftById.get(e.shiftId) : undefined;
            return {
                date: new Date(e.date),
                hours: s?.totalHours ?? e.shift?.totalHours ?? 0,
                earned: (s?.salaries ?? []).reduce((a, w) => a + (w.salary ?? 0), 0),
            };
        });
        return { weekly: buildWeekly(occ, weekStart), prevWeek: buildWeekly(occ, lastWeekStart), monthly: buildMonthly(occ, now), yearly: buildYearly(occ) };
    }, [shifts, assignments]);

    const handleExport = async (format: ReportFormat) => {
        setExporting(format); setMenuOpen(false);
        try {
            const data = await generateReport();
            await exportReport(data, format);
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Failed to export report');
        } finally {
            setExporting(null);
        }
    };

    // ── derived content per tab ──
    const weeklyTotals = { earn: weekly.reduce((s, d) => s + d.earnings, 0), hours: weekly.reduce((s, d) => s + d.hours, 0) };
    const prevWeekTotals = { earn: prevWeek.reduce((s, d) => s + d.earnings, 0), hours: prevWeek.reduce((s, d) => s + d.hours, 0) };
    const weekAvg = weeklyTotals.hours > 0 ? +(weeklyTotals.earn / weeklyTotals.hours).toFixed(2) : 0;
    const prevAvg = prevWeekTotals.hours > 0 ? prevWeekTotals.earn / prevWeekTotals.hours : 0;
    const weekMax = Math.max(1, ...weekly.map((d) => d.earnings));
    const bestDay = weekly.reduce((a, b) => (b.earnings > a.earnings ? b : a), weekly[0]);

    const monthMax = Math.max(1, ...monthly.map((d) => d.earnings));
    const monthTotals = { earn: monthly.reduce((s, d) => s + d.earnings, 0), hours: monthly.reduce((s, d) => s + d.hours, 0) };
    const monthPeak = monthly.reduce((a, b) => (b.earnings > a.earnings ? b : a), monthly[0] ?? { earnings: 0, label: '', hours: 0 });
    const mLast = monthly[monthly.length - 1]?.earnings ?? 0, mPrev = monthly[monthly.length - 2]?.earnings ?? 0;

    const yearMax = Math.max(1, ...yearly.map((d) => d.earnings));
    const yearTotal = yearly.reduce((s, d) => s + d.earnings, 0);
    const bestYear = yearly.reduce((a, b) => (b.earnings > a.earnings ? b : a), yearly[0] ?? { earnings: 0, label: '', hours: 0 });

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader
                title="Reports"
                subtitle={`EXPORT: LAST ${reportMonths} MONTH${reportMonths > 1 ? 'S' : ''}`}
                rightAction={
                    <TouchableOpacity onPress={() => setMenuOpen(true)} disabled={exporting !== null} style={styles.headerBtn}>
                        {exporting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="download-outline" size={22} color="#fff" />}
                    </TouchableOpacity>
                }
            />
            <View style={styles.controls}>
                <SegmentedTabs options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} value={tab} onChange={setTab} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
                ) : tab === 'weekly' ? (
                    <>
                        <View style={styles.tilesRow}>
                            <StatTile label="Weekly Earn" value={money(weeklyTotals.earn)} icon="wallet-outline" trend={pctChange(weeklyTotals.earn, prevWeekTotals.earn)} sub="vs last" />
                            <StatTile label="Hours" value={`${weeklyTotals.hours}h`} icon="time-outline" trend={pctChange(weeklyTotals.hours, prevWeekTotals.hours)} sub="vs last" />
                        </View>
                        <StatTile label="Avg. Hourly Rate" value={money(weekAvg)} icon="speedometer-outline" trend={pctChange(weekAvg, prevAvg)} sub="vs last week" />
                        <Card>
                            <Text style={styles.cardTitle}>Daily Earnings</Text>
                            <Bars bars={weekly.map((d) => ({ label: d.short, pct: Math.round((d.earnings / weekMax) * 90), dim: d.hours === 0 }))} />
                            <DataRows rows={weekly.map((d) => ({ label: d.day.slice(0, 3), hours: d.hours, earnings: d.earnings }))} />
                        </Card>
                        <Card style={styles.insight}>
                            <View style={styles.insightRow}>
                                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.insightIcon}>
                                    <Ionicons name="sparkles" size={18} color="#fff" />
                                </LinearGradient>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.insightTitle}>Smart Insight</Text>
                                    <Text style={styles.insightText}>
                                        {weeklyTotals.earn > 0
                                            ? `Your best day this week was ${bestDay.day}, earning ${money(bestDay.earnings)} across ${bestDay.hours}h. You're ${pctChange(weeklyTotals.earn, prevWeekTotals.earn) >= 0 ? 'up' : 'down'} ${Math.abs(pctChange(weeklyTotals.earn, prevWeekTotals.earn))}% versus last week.`
                                            : 'No earnings recorded this week yet. Add shifts and wages to see insights here.'}
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    </>
                ) : tab === 'monthly' ? (
                    <>
                        <View style={styles.tilesRow}>
                            <StatTile label="Earnings 6M" value={money(monthTotals.earn)} icon="wallet-outline" trend={pctChange(mLast, mPrev)} sub="mo/mo" />
                            <StatTile label="Hours 6M" value={`${monthTotals.hours}h`} icon="time-outline" sub="6 months" />
                        </View>
                        <StatTile label="Peak Month" value={money(monthPeak.earnings)} icon="calendar-outline" sub="best in 6 months" />
                        <Card>
                            <Text style={styles.cardTitle}>Monthly Earnings</Text>
                            <Bars bars={monthly.map((d) => ({ label: d.label, pct: Math.round((d.earnings / monthMax) * 90) }))} />
                            <DataRows rows={monthly.map((d) => ({ label: d.label, hours: d.hours, earnings: d.earnings }))} />
                        </Card>
                    </>
                ) : (
                    yearly.length === 0 ? (
                        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Ionicons name="bar-chart-outline" size={40} color={COLORS.outlineVar} />
                            <Text style={[styles.insightText, { marginTop: 12, textAlign: 'center' }]}>No yearly data yet — add shifts to build your history.</Text>
                        </Card>
                    ) : (
                        <>
                            <View style={styles.tilesRow}>
                                <StatTile label="Lifetime" value={money(yearTotal)} icon="wallet-outline" sub="all time" />
                                <StatTile label="Best Year" value={money(bestYear.earnings)} icon="trending-up" sub={bestYear.label} />
                            </View>
                            <Card>
                                <Text style={styles.cardTitle}>Year-on-Year</Text>
                                <Bars bars={yearly.map((d) => ({ label: d.label, pct: Math.round((d.earnings / yearMax) * 90) }))} />
                                <DataRows rows={yearly.map((d) => ({ label: d.label, hours: d.hours, earnings: d.earnings }))} />
                            </Card>
                        </>
                    )
                )}
            </ScrollView>
            <BottomNav active="more" />

            <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Export Report">
                <Text style={styles.exportHint}>Covers the last {reportMonths} month{reportMonths > 1 ? 's' : ''} · change in Settings</Text>
                {EXPORT_FORMATS.map((f) => (
                    <TouchableOpacity key={f.value} style={styles.exportOption} onPress={() => handleExport(f.value)} activeOpacity={0.7}>
                        <Ionicons name={f.icon as any} size={20} color={COLORS.primary} />
                        <Text style={styles.exportOptionText}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    controls: { paddingHorizontal: 16, paddingTop: 12 },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 14 },

    tilesRow: { flexDirection: 'row', gap: 12 },
    tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
    tileLabel: { flex: 1, fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4 },
    tileIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    tileValue: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.primary },
    tileTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    tileTrend: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    tileTrendText: { fontSize: 11, fontFamily: FONTS.bold },
    tileSub: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },

    cardTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 12 },
    barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 180 },
    barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
    bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    barLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4, marginTop: 6 },

    dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    dataRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(37,99,235,0.06)' },
    dataLabel: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurface },
    dataHours: { width: 60, textAlign: 'center', fontSize: 13, fontFamily: FONTS.regular, color: COLORS.outline },
    dataEarn: { width: 90, textAlign: 'right', fontSize: 13, fontFamily: FONTS.bold },

    insight: { borderLeftWidth: 3, borderLeftColor: COLORS.secondary },
    insightRow: { flexDirection: 'row', gap: 12 },
    insightIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    insightTitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 4 },
    insightText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 19 },

    exportHint: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline, marginBottom: 12 },
    exportOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(37,99,235,0.06)' },
    exportOptionText: { fontSize: 15, fontFamily: FONTS.medium, color: COLORS.onSurface },
});
