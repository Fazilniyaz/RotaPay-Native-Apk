import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import SelectField from '../../components/ui/SelectField';
import { ClockSession, Salary } from '../../lib/types';
import { listSalaries } from '../../lib/services/salaries';
import { getActiveClocks, clockIn, clockOut, listClock } from '../../lib/services/clock';
import { money, currencySymbol, fmtDateShort as fmtDate, fmtTime } from '../../lib/format';
import { useDeviceIntegrity } from '../../hooks/useDeviceIntegrity';

const pad = (n: number) => String(n).padStart(2, '0');
const fmtElapsed = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};
const initials = (name?: string | null) =>
    (name ?? '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const salaryLabel = (s: Salary) => {
    const emp = s.employer?.employerName ?? 'Unknown';
    const shift = s.shift?.shiftName || s.shift?.shiftType || 'no shift';
    const rate = s.hourlyPayRate != null ? `${currencySymbol()}${s.hourlyPayRate}/h` : '—';
    return `${emp} · ${shift} · ${rate}`;
};

export default function ClockScreen() {
    // Clocking in affects attendance + pay — a sensitive feature we restrict on
    // a compromised (rooted/jailbroken) device (blueprint point 3).
    const { compromised } = useDeviceIntegrity();
    const [active, setActive] = useState<ClockSession[]>([]);
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [sessions, setSessions] = useState<ClockSession[]>([]);
    const [summary, setSummary] = useState({ totalHours: 0, totalEarnings: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedSalaryId, setSelectedSalaryId] = useState('');
    const [busyIn, setBusyIn] = useState(false);
    const [busyOut, setBusyOut] = useState<string | null>(null);
    const [now, setNow] = useState(() => new Date());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [act, salRes, hist] = await Promise.all([
                getActiveClocks(),
                listSalaries({ limit: 100 }),
                listClock({ status: 'completed', limit: 50 }),
            ]);
            setActive(act);
            setSalaries(salRes.data);
            setSessions(hist.data);
            setSummary({
                totalHours: hist.meta?.summary?.totalHours ?? 0,
                totalEarnings: hist.meta?.summary?.totalEarnings ?? 0,
            });
        } catch {
            notify('Error', 'Failed to load clock data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const activeSalaryIds = useMemo(() => new Set(active.map((a) => a.salaryId)), [active]);
    // A wage is clockable if it's tied to a shift and isn't already running. The
    // employee is optional (clock-in only needs the wage's rate).
    const clockable = useMemo(
        () => salaries.filter((s) => s.shift && !activeSalaryIds.has(s.id)),
        [salaries, activeSalaryIds]
    );

    const liveEarnings = useMemo(
        () => active.reduce((sum, s) => {
            const ms = now.getTime() - new Date(s.clockInTime).getTime();
            return sum + (ms / 3_600_000) * (s.salary?.hourlyPayRate ?? 0);
        }, 0),
        [active, now]
    );

    const doClockIn = async () => {
        if (compromised) {
            return notify('Blocked', 'Clock-in is disabled on a rooted/jailbroken device for security.');
        }
        if (!selectedSalaryId) return notify('Error', 'Select an employer/shift to clock in');
        setBusyIn(true);
        try {
            await clockIn(selectedSalaryId);
            setSelectedSalaryId('');
            load();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Clock in failed');
        } finally {
            setBusyIn(false);
        }
    };

    const doClockOut = async (id: string) => {
        setBusyOut(id);
        try {
            const done = await clockOut(id);
            notify('Clocked out', `${money(done.earnings)} earned`);
            load();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Clock out failed');
            setBusyOut(null);
        }
    };

    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentDate = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const stats = [
        { label: 'On Clock', value: String(active.length), icon: 'flash-outline' },
        { label: 'Total Hours', value: `${summary.totalHours}h`, icon: 'time-outline' },
        { label: 'Earnings', value: money(summary.totalEarnings), icon: 'wallet-outline' },
    ];

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader title="Time Clock" subtitle="TRACK HOURS & EARNINGS" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Hero */}
                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                    <Text style={styles.heroDate}>{currentDate.toUpperCase()}</Text>
                    <Text style={styles.heroTime}>{currentTime}</Text>
                    <View style={styles.heroStatus}>
                        <Ionicons name="trending-up" size={13} color="rgba(255,255,255,0.85)" />
                        <Text style={styles.heroStatusText}>
                            {active.length > 0 ? `${active.length} on the clock · ≈ ${money(liveEarnings)} accruing` : 'No one is currently clocked in'}
                        </Text>
                    </View>

                    <View style={styles.clockInBox}>
                        <Text style={styles.clockInLabel}>CLOCK SOMEONE IN</Text>
                        <View style={styles.clockInPickerWrap}>
                            <SelectField
                                value={selectedSalaryId}
                                placeholder={clockable.length === 0 ? 'No employees available' : 'Select employer / shift…'}
                                onChange={setSelectedSalaryId}
                                options={clockable.map((s) => ({ value: s.id, label: salaryLabel(s) }))}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.clockInBtn, (busyIn || clockable.length === 0) && { opacity: 0.5 }]}
                            onPress={doClockIn}
                            disabled={busyIn || clockable.length === 0}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="play" size={16} color={COLORS.primary} />
                            <Text style={styles.clockInBtnText}>{busyIn ? '…' : 'CLOCK IN'}</Text>
                        </TouchableOpacity>
                        {clockable.length === 0 && active.length === 0 && (
                            <Text style={styles.clockInHint}>Add a wage to a shift first (Shifts → Add Wages), then clock into it.</Text>
                        )}
                    </View>
                </LinearGradient>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {stats.map((c) => (
                        <Card key={c.label} style={styles.statCard} padding={14}>
                            <View style={styles.statTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statLabel}>{c.label.toUpperCase()}</Text>
                                    <Text style={styles.statValue} numberOfLines={1}>{c.value}</Text>
                                </View>
                                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.statIcon}>
                                    <Ionicons name={c.icon as any} size={16} color="#fff" />
                                </LinearGradient>
                            </View>
                        </Card>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {active.length > 0 && (
                            <>
                                <Text style={styles.sectionLabel}>● CURRENTLY CLOCKED IN</Text>
                                {active.map((s) => {
                                    const elapsedMs = now.getTime() - new Date(s.clockInTime).getTime();
                                    const rate = s.salary?.hourlyPayRate ?? 0;
                                    const est = Math.round((elapsedMs / 3_600_000) * rate * 100) / 100;
                                    const name = s.salary?.employer?.employerName ?? 'Shift';
                                    return (
                                        <Card key={s.id} padding={0} style={styles.activeCard}>
                                            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeAccent} />
                                            <View style={{ padding: 16 }}>
                                                <View style={styles.activeHead}>
                                                    <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.avatar}>
                                                        <Text style={styles.avatarText}>{initials(name)}</Text>
                                                    </LinearGradient>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.activeName} numberOfLines={1}>{name}</Text>
                                                        <Text style={styles.activeMeta} numberOfLines={1}>
                                                            {s.salary?.shift?.shiftName || s.salary?.shift?.shiftType || 'No shift'} · in {fmtTime(s.clockInTime)}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.liveBadge}>
                                                        <View style={styles.liveDot} />
                                                        <Text style={styles.liveText}>LIVE</Text>
                                                    </View>
                                                </View>

                                                <Text style={styles.elapsed}>{fmtElapsed(elapsedMs)}</Text>

                                                <View style={styles.estStrip}>
                                                    <View style={styles.estCell}>
                                                        <Text style={styles.estLabel}>EST. PAY</Text>
                                                        <Text style={[styles.estVal, { color: COLORS.secondary }]}>{money(est)}</Text>
                                                    </View>
                                                    <View style={[styles.estCell, { borderLeftWidth: 1, borderLeftColor: 'rgba(58,146,149,0.08)' }]}>
                                                        <Text style={styles.estLabel}>RATE</Text>
                                                        <Text style={[styles.estVal, { color: COLORS.primary }]}>{currencySymbol()}{rate}/h</Text>
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    style={[styles.clockOutBtn, busyOut === s.id && { opacity: 0.6 }]}
                                                    onPress={() => doClockOut(s.id)}
                                                    disabled={busyOut === s.id}
                                                    activeOpacity={0.85}
                                                >
                                                    <Ionicons name="stop" size={14} color="#fff" />
                                                    <Text style={styles.clockOutText}>{busyOut === s.id ? 'CLOCKING OUT…' : 'CLOCK OUT'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </Card>
                                    );
                                })}
                            </>
                        )}

                        {/* History */}
                        <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>
                        <Card padding={0}>
                            {sessions.length === 0 ? (
                                <Text style={styles.emptyNote}>No completed sessions yet.</Text>
                            ) : (
                                sessions.map((s, i) => {
                                    const name = s.salary?.employer?.employerName ?? 'Shift';
                                    return (
                                        <View key={s.id} style={[styles.histRow, i < sessions.length - 1 && styles.rowBorder]}>
                                            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.histAvatar}>
                                                <Text style={styles.histAvatarText}>{initials(name)}</Text>
                                            </LinearGradient>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.histName} numberOfLines={1}>{name}</Text>
                                                <Text style={styles.histMeta}>
                                                    {fmtDate(s.clockInTime)} · {fmtTime(s.clockInTime)}–{fmtTime(s.clockOutTime)} · {s.totalHours ?? 0}h
                                                </Text>
                                            </View>
                                            <Text style={styles.histEarn}>{money(s.earnings)}</Text>
                                        </View>
                                    );
                                })
                            )}
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
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 16 },

    hero: { borderRadius: RADIUS.xl, padding: 20, ...SHADOW.button },
    heroDate: { fontSize: 10, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
    heroTime: { fontSize: 48, fontFamily: FONTS.bold, color: '#fff', marginTop: 4, letterSpacing: 1 },
    heroStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    heroStatusText: { fontSize: 12, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.85)', flex: 1 },
    clockInBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 14, marginTop: 18 },
    clockInLabel: { fontSize: 10, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8, marginBottom: 8 },
    clockInPickerWrap: { backgroundColor: '#fff', borderRadius: RADIUS.md, marginBottom: 10 },
    clockInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 13 },
    clockInBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 1 },
    clockInHint: { fontSize: 11, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1 },
    statTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    statLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4, marginBottom: 4 },
    statValue: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primary },
    statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    sectionLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 1 },

    activeCard: { overflow: 'hidden' },
    activeAccent: { height: 4, width: '100%' },
    activeHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontFamily: FONTS.bold, color: '#fff' },
    activeName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 2 },
    activeMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(4,120,87,0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#63c1bb' },
    liveText: { fontSize: 9, fontFamily: FONTS.bold, color: '#105f68', letterSpacing: 0.5 },
    elapsed: { fontSize: 38, fontFamily: FONTS.bold, color: COLORS.onSurface, textAlign: 'center', letterSpacing: 1 },
    estStrip: { flexDirection: 'row', backgroundColor: 'rgba(58,146,149,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(58,146,149,0.06)', padding: 10, marginVertical: 14 },
    estCell: { flex: 1, alignItems: 'center' },
    estLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4, marginBottom: 2 },
    estVal: { fontSize: 14, fontFamily: FONTS.semiBold },
    clockOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#b3261e', borderRadius: RADIUS.md, paddingVertical: 12 },
    clockOutText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff', letterSpacing: 1 },

    emptyNote: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.outline, textAlign: 'center', padding: 24 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(58,146,149,0.06)' },
    histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    histAvatar: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    histAvatarText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff' },
    histName: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface, marginBottom: 2 },
    histMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },
    histEarn: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.secondary },
});
