import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput,
} from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import { Modal, ConfirmDialog, ModalActions } from '../../components/ui/Modal';
import SelectField from '../../components/ui/SelectField';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { loadAllData, refreshAnalytics, refreshPaidMonths } from '../../store/slices/dataSlice';
import { Shift, CalendarEntry, CalendarEntryType } from '../../lib/types';
import { listShifts } from '../../lib/services/shifts';
import { listCalendar, createCalendarEntry, deleteCalendarEntry } from '../../lib/services/calendar';
import { listPaidMonths, markMonthPaid, unmarkMonthPaid, PaidMonth } from '../../lib/services/payments';
import { fmtTime } from '../../lib/format';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Light, matte-finished label palette.
const PALETTE = ['#7FA9E0', '#6FC8A8', '#E0B36A', '#A88FD8', '#E38FA0', '#6FC0CC'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayISO = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();
const tint = (hex: string) => `${hex}22`;
const typeIcon: Record<CalendarEntryType, string> = { shift: 'time-outline', event: 'calendar-outline', memo: 'reader-outline' };

export default function CalendarScreen() {
    const dispatch = useDispatch<AppDispatch>();
    const [viewDate, setViewDate] = useState(() => new Date());
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [paidMonths, setPaidMonths] = useState<PaidMonth[]>([]);
    const [loading, setLoading] = useState(true);

    // Employees come from the shared cache; the default one seeds the view.
    const employers = useSelector((s: RootState) => s.data.employers);
    const defaultEmployerId = useSelector((s: RootState) => s.data.defaultEmployerId);

    // Which employee's calendar is being viewed. Null → default employee.
    const [scopeChoice, setScopeChoice] = useState<string | null>(null);
    const scopeId = scopeChoice ?? defaultEmployerId;
    const scopeEmployer = employers.find((e) => e.id === scopeId) ?? null;

    const [dayPopup, setDayPopup] = useState<Date | null>(null);
    const [addKind, setAddKind] = useState<'event' | 'memo' | null>(null);
    const [addTitle, setAddTitle] = useState('');
    const [addColor, setAddColor] = useState(PALETTE[0]);
    const [busy, setBusy] = useState(false);

    const [delTarget, setDelTarget] = useState<CalendarEntry | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [empOpen, setEmpOpen] = useState(false);

    const [markOpen, setMarkOpen] = useState(false);
    const [payYear, setPayYear] = useState(() => new Date().getFullYear());
    const [payMonth, setPayMonth] = useState(() => new Date().getMonth() + 1);
    const [marking, setMarking] = useState(false);

    const cells = useMemo(() => {
        const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const offset = (first.getDay() + 6) % 7;
        const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
        return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }, [viewDate]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const from = cells[0];
            const to = cells[cells.length - 1];
            const employerId = scopeId ?? undefined;
            const [shiftRes, entryRes, paidRes] = await Promise.all([
                // Shifts are GLOBAL presets — assignable to any employee's calendar.
                listShifts({ limit: 200 }),
                listCalendar({ from: from.toISOString(), to: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59).toISOString(), employerId }),
                listPaidMonths(employerId),
            ]);
            setShifts(shiftRes.data);
            setEntries(entryRes);
            setPaidMonths(paidRes);
        } catch {
            notify('Error', 'Failed to load calendar');
        } finally {
            setLoading(false);
        }
    }, [cells, scopeId]);

    useEffect(() => { dispatch(loadAllData()); }, [dispatch]);
    useEffect(() => { load(); }, [load]);

    const today = startOfDay(new Date());
    const monthLabel = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const dayEntries = (d: Date) => entries.filter((e) => isSameDay(new Date(e.date), d));
    // Presets are date-free — every preset can be assigned to any day.
    const presetShifts = shifts;
    const isPaid = (year: number, month: number) => paidMonths.some((p) => p.year === year && p.month === month);
    const shiftLabelText = (s: Shift) => s.shiftName || `${s.shiftType ?? 'Shift'}`;

    const addEntry = async (type: CalendarEntryType, title: string, color: string, shiftId?: string) => {
        if (!dayPopup) return;
        setBusy(true);
        try {
            await createCalendarEntry({ date: dayISO(dayPopup), type, title, color, shiftId, employerId: scopeId ?? undefined });
            await load();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Failed to add');
        } finally {
            setBusy(false);
        }
    };
    const submitAddNote = async () => {
        if (!addKind) return;
        const t = addTitle.trim();
        if (!t) return notify('Error', 'Enter a name');
        if (t.split(/\s+/).length > 15) return notify('Error', 'Name must be 15 words or fewer');
        await addEntry(addKind, t, addColor);
        setAddKind(null);
        setAddTitle('');
    };
    // Assigning a preset onto the day creates a shift-type entry in its colour.
    const assignShift = (s: Shift) => addEntry('shift', shiftLabelText(s), s.color ?? PALETTE[0], s.id);

    const confirmDelete = async () => {
        if (!delTarget) return;
        setDeleting(true);
        try {
            await deleteCalendarEntry(delTarget.id);
            setDelTarget(null);
            load();
        } catch {
            notify('Error', 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const submitMark = async () => {
        setMarking(true);
        try {
            await markMonthPaid(payYear, payMonth, scopeId ?? undefined);
            setPaidMonths(await listPaidMonths(scopeId ?? undefined));
            // This employee's Total / This-Month pay changed → refresh cache.
            dispatch(refreshAnalytics());
            dispatch(refreshPaidMonths());
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Failed to mark paid');
        } finally {
            setMarking(false);
        }
    };
    const toggleUnmark = async (p: PaidMonth) => {
        try {
            await unmarkMonthPaid(p.year, p.month, scopeId ?? undefined);
            setPaidMonths((prev) => prev.filter((x) => x.id !== p.id));
            dispatch(refreshAnalytics());
            dispatch(refreshPaidMonths());
        } catch {
            notify('Error', 'Failed to unmark');
        }
    };

    const currentMonthPaid = isPaid(viewDate.getFullYear(), viewDate.getMonth() + 1);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader
                title="Calendar"
                subtitle={scopeEmployer ? `${scopeEmployer.employerName.toUpperCase()}'S SCHEDULE` : 'EVENTS · MEMOS · SHIFTS'}
                showBack
            />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <View style={styles.chips}>
                    <TouchableOpacity style={styles.chip} onPress={() => setEmpOpen(true)} activeOpacity={0.7}>
                        <Ionicons name="people-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.chipText}>{scopeEmployer ? 'SWITCH' : 'BY EMPLOYEE'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chip} onPress={() => setMarkOpen(true)} activeOpacity={0.7}>
                        <Ionicons name="wallet-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.chipText}>MARK PAID</Text>
                    </TouchableOpacity>
                </View>

                {/* Month bar */}
                <Card padding={10} style={styles.monthBar}>
                    <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.monthMid}>
                        <Text style={styles.monthLabel}>{monthLabel}</Text>
                        {currentMonthPaid && (
                            <View style={styles.paidBadge}>
                                <Ionicons name="checkmark" size={10} color={COLORS.secondary} />
                                <Text style={styles.paidText}>PAID</Text>
                            </View>
                        )}
                        <TouchableOpacity onPress={() => setViewDate(new Date())} style={styles.todayBtn}>
                            <Text style={styles.todayText}>TODAY</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </Card>

                {/* Grid */}
                <Card padding={8}>
                    <View style={styles.weekRow}>
                        {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
                    </View>
                    {loading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 40 }} />
                    ) : (
                        <View style={styles.grid}>
                            {cells.map((d, i) => {
                                const inMonth = d.getMonth() === viewDate.getMonth();
                                const isToday = isSameDay(d, today);
                                const isOpen = dayPopup ? isSameDay(d, dayPopup) : false;
                                const de = dayEntries(d);
                                // Highlight the WHOLE cell for today / the opened day.
                                const cellHi = isToday ? styles.cellToday : isOpen ? styles.cellOpen : null;
                                return (
                                    <TouchableOpacity key={i} style={[styles.cell, !inMonth && styles.cellOut, cellHi]} onPress={() => setDayPopup(d)} activeOpacity={0.7}>
                                        <View style={styles.cellTop}>
                                            <Text style={[styles.dayNum, !inMonth && styles.dayNumOut, isToday && styles.dayNumTodayHi]}>{d.getDate()}</Text>
                                        </View>
                                        <View style={{ gap: 2, marginTop: 2 }}>
                                            {de.slice(0, 2).map((e) => (
                                                <View key={e.id} style={[styles.entryChip, { backgroundColor: tint(e.color || PALETTE[0]) }]}>
                                                    <Text style={[styles.entryChipText, { color: e.color || PALETTE[0] }]} numberOfLines={1}>{e.title}</Text>
                                                </View>
                                            ))}
                                            {de.length > 2 && <Text style={styles.moreText}>+{de.length - 2}</Text>}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </Card>
            </ScrollView>
            <BottomNav active="more" />

            {/* Day popup */}
            <Modal
                open={!!dayPopup}
                onClose={() => { setDayPopup(null); setAddKind(null); setAddTitle(''); }}
                title={dayPopup ? dayPopup.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Day'}
            >
                {dayPopup && (
                    <>
                        <Text style={styles.sectionLabel}>ON THIS DAY ({dayEntries(dayPopup).length})</Text>
                        {dayEntries(dayPopup).length === 0 ? (
                            <Text style={styles.muted}>Nothing on this day yet.</Text>
                        ) : (
                            dayEntries(dayPopup).map((e) => (
                                <View key={e.id} style={[styles.entryRow, { backgroundColor: tint(e.color || '#005ea3') }]}>
                                    <Ionicons name={typeIcon[e.type] as any} size={16} color={e.color || '#005ea3'} />
                                    <Text style={[styles.entryRowTitle, { color: e.color || '#005ea3' }]} numberOfLines={1}>{e.title}</Text>
                                    <Text style={[styles.entryRowType, { color: e.color || '#005ea3' }]}>{e.type}</Text>
                                    <TouchableOpacity onPress={() => setDelTarget(e)} hitSlop={8}>
                                        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}

                        <View style={styles.shiftHeader}>
                            <Text style={styles.sectionLabel}>SHIFTS ({presetShifts.length})</Text>
                        </View>
                        {presetShifts.length === 0 ? (
                            <Text style={styles.muted}>No shift presets yet — create them on the Shifts screen.</Text>
                        ) : (
                            presetShifts.map((s) => {
                                const assigned = dayEntries(dayPopup).some((e) => e.type === 'shift' && e.shiftId === s.id);
                                return (
                                    <View key={s.id} style={styles.shiftRow}>
                                        <View style={[styles.shiftColorDot, { backgroundColor: s.color ?? PALETTE[0] }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.shiftRowName} numberOfLines={1}>{shiftLabelText(s)}</Text>
                                            <Text style={styles.shiftRowTime}>{fmtTime(s.startTime)} – {fmtTime(s.endTime)} · {s.totalHours}h{s.employer?.employerName ? ` · ${s.employer.employerName}` : ''}</Text>
                                        </View>
                                        <TouchableOpacity disabled={assigned || busy} onPress={() => assignShift(s)} style={[styles.showBtn, (assigned || busy) && { opacity: 0.5 }]}>
                                            <Text style={styles.showBtnText}>{assigned ? 'ASSIGNED' : 'ASSIGN SHIFT'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}

                        <View style={styles.addNoteSection}>
                            {!addKind ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity style={styles.addKindBtn} onPress={() => { setAddKind('event'); setAddColor(PALETTE[3]); }}>
                                        <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                                        <Text style={styles.addKindText}>ADD EVENT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.addKindBtn} onPress={() => { setAddKind('memo'); setAddColor(PALETTE[2]); }}>
                                        <Ionicons name="reader-outline" size={16} color={COLORS.primary} />
                                        <Text style={styles.addKindText}>ADD MEMO</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.fieldLabel}>{addKind === 'event' ? 'EVENT NAME' : 'MEMO NAME'}</Text>
                                    <TextInput style={styles.input} placeholder={addKind === 'event' ? 'e.g. Team meeting' : 'e.g. Bring uniform'} placeholderTextColor={COLORS.outline} value={addTitle} onChangeText={setAddTitle} autoFocus />
                                    <View style={styles.paletteRow}>
                                        <Text style={styles.muted}>Colour:</Text>
                                        {PALETTE.map((c) => (
                                            <TouchableOpacity key={c} onPress={() => setAddColor(c)} style={[styles.paletteSwatch, { backgroundColor: c }, addColor === c && styles.paletteActive]} />
                                        ))}
                                    </View>
                                    <View style={{ marginTop: 12 }}>
                                        <ModalActions onCancel={() => { setAddKind(null); setAddTitle(''); }} onConfirm={submitAddNote} confirmLabel={`Add ${addKind}`} loading={busy} />
                                    </View>
                                </>
                            )}
                        </View>
                    </>
                )}
            </Modal>

            {/* Employee picker */}
            <Modal open={empOpen} onClose={() => setEmpOpen(false)} title="Show calendar for">
                {employers.length === 0 && <Text style={styles.muted}>No employees yet — add them on the Employers screen.</Text>}
                {employers.map((emp) => (
                    <TouchableOpacity key={emp.id} style={[styles.empOption, scopeId === emp.id && styles.empOptionActive]} onPress={() => { setScopeChoice(emp.id); setEmpOpen(false); }}>
                        <View style={styles.empInitial}><Text style={styles.empInitialText}>{emp.employerName.slice(0, 1).toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.empOptionName} numberOfLines={1}>{emp.employerName}</Text>
                                {emp.id === defaultEmployerId && (
                                    <View style={styles.empDefaultBadge}><Text style={styles.empDefaultText}>DEFAULT</Text></View>
                                )}
                            </View>
                            <Text style={styles.muted} numberOfLines={1}>{emp.store}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </Modal>

            {/* Mark month paid */}
            <Modal open={markOpen} onClose={() => setMarkOpen(false)} title="Mark month as paid"
                footer={<ModalActions onCancel={() => setMarkOpen(false)} cancelLabel="Close" onConfirm={submitMark} confirmLabel="Confirm" loading={marking} />}>
                <Text style={styles.muted}>Marking a month paid records the total wages of that month&apos;s shifts and updates the pay tabs on Shifts.</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                    <View style={{ flex: 1 }}>
                        <SelectField label="Month" value={String(payMonth)} onChange={(v) => setPayMonth(Number(v))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <SelectField label="Year" value={String(payYear)} onChange={(v) => setPayYear(Number(v))} options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => ({ value: String(y), label: String(y) }))} />
                    </View>
                </View>
                {paidMonths.length > 0 && (
                    <View style={{ marginTop: 16 }}>
                        <Text style={styles.sectionLabel}>PAID MONTHS</Text>
                        {paidMonths.map((p) => (
                            <View key={p.id} style={styles.paidRow}>
                                <Text style={styles.paidRowText}>{MONTHS[p.month - 1]} {p.year}</Text>
                                <TouchableOpacity onPress={() => toggleUnmark(p)}><Text style={styles.unmarkText}>UNMARK</Text></TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </Modal>

            <ConfirmDialog
                open={!!delTarget}
                title="Remove from calendar?"
                message={`Remove "${delTarget?.title}" from the calendar?`}
                confirmLabel="Remove"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDelTarget(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 14 },

    chips: { flexDirection: 'row', gap: 10 },
    chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,94,163,0.2)', borderRadius: RADIUS.md, paddingVertical: 11 },
    chipText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },

    monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    monthMid: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    monthLabel: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.onSurface },
    paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,109,48,0.1)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    paidText: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.secondary, letterSpacing: 0.4 },
    todayBtn: { borderWidth: 1, borderColor: 'rgba(0,94,163,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    todayText: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.6 },

    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekday: { flex: 1, textAlign: 'center', fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.5, paddingVertical: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, minHeight: 62, padding: 3, borderWidth: 0.5, borderColor: 'rgba(0,94,163,0.06)' },
    cellOut: { backgroundColor: 'rgba(0,0,0,0.015)' },
    cellToday: { backgroundColor: 'rgba(0,94,163,0.10)', borderWidth: 1.5, borderColor: COLORS.primary },
    cellOpen: { backgroundColor: 'rgba(0,109,48,0.10)', borderWidth: 1.5, borderColor: COLORS.secondary },
    dayNumTodayHi: { color: COLORS.primary },
    cellTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayNum: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.onSurface, width: 22, height: 22, textAlign: 'center', textAlignVertical: 'center' },
    dayNumOut: { color: COLORS.outlineVar },
    dayNumToday: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    dayNumTodayText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff' },
    shiftDot: { backgroundColor: 'rgba(0,94,163,0.08)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    shiftDotText: { fontSize: 8, fontFamily: FONTS.bold, color: COLORS.primary },
    entryChip: { borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
    entryChipText: { fontSize: 8, fontFamily: FONTS.semiBold },
    moreText: { fontSize: 8, fontFamily: FONTS.regular, color: COLORS.outline, paddingLeft: 2 },

    sectionLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
    muted: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline },
    entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.sm, padding: 10, marginBottom: 8 },
    entryRowTitle: { flex: 1, fontSize: 13, fontFamily: FONTS.semiBold },
    entryRowType: { fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.4, opacity: 0.7, textTransform: 'uppercase' },

    shiftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    addShiftLink: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
    shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(0,94,163,0.08)', borderRadius: RADIUS.sm, padding: 10, marginBottom: 8 },
    shiftColorDot: { width: 12, height: 12, borderRadius: 6 },
    shiftRowName: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    shiftRowTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },
    showBtn: { borderWidth: 1, borderColor: 'rgba(0,94,163,0.2)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    showBtnText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },

    addNoteSection: { borderTopWidth: 1, borderTopColor: 'rgba(0,94,163,0.08)', marginTop: 14, paddingTop: 14 },
    addKindBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,94,163,0.2)', borderRadius: RADIUS.sm, paddingVertical: 12 },
    addKindText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
    fieldLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    input: { backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    paletteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    paletteSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
    paletteActive: { borderColor: COLORS.onSurfaceVar },

    empOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, padding: 12, marginBottom: 10 },
    empOptionActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,94,163,0.04)' },
    empOptionIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    empOptionName: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    empInitial: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0,94,163,0.1)', alignItems: 'center', justifyContent: 'center' },
    empInitialText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },
    empDefaultBadge: { backgroundColor: 'rgba(0,109,48,0.1)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    empDefaultText: { fontSize: 8, fontFamily: FONTS.bold, color: '#006d30', letterSpacing: 0.5 },

    paidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(0,109,48,0.2)', backgroundColor: 'rgba(0,109,48,0.04)', borderRadius: RADIUS.sm, padding: 10, marginBottom: 8 },
    paidRowText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurface },
    unmarkText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.error, letterSpacing: 0.5 },
});
