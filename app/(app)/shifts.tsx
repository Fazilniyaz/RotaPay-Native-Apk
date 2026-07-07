import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput,
    ActivityIndicator,
} from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import TimeField from '../../components/ui/TimeField';
import SelectField from '../../components/ui/SelectField';
import { Modal, ConfirmDialog, ModalActions } from '../../components/ui/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
    loadAllData,
    refreshShifts,
    refreshWages,
    refreshAnalytics,
} from '../../store/slices/dataSlice';
import { Salary, Shift } from '../../lib/types';
import { createShift, updateShift, deleteShift } from '../../lib/services/shifts';
import { createSalary, updateSalary, deleteSalary } from '../../lib/services/salaries';
import { money, currencySymbol, fmtTime } from '../../lib/format';

const PRESET_TYPES = ['day', 'night', 'rotational'];
// Light, matte-finished label palette.
const SHIFT_COLORS = ['#7FA9E0', '#6FC8A8', '#E0B36A', '#A88FD8', '#E38FA0', '#6FC0CC'];

type Filter = 'all' | 'wages';
const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Shifts' },
    { value: 'wages', label: 'Wages' },
];

const todayInput = () => new Date().toISOString().slice(0, 10);
// A preset has no date — build the time-of-day against today so the backend can
// derive the duration (it ignores the date part).
const combineISO = (time: string) => new Date(`${todayInput()}T${time}`).toISOString();
const toTimeInput = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const hoursBetween = (startTime: string, endTime: string): number => {
    const today = todayInput();
    const start = new Date(`${today}T${startTime}`).getTime();
    let end = new Date(`${today}T${endTime}`).getTime();
    if (isNaN(start) || isNaN(end)) return 0;
    if (end <= start) end += 86_400_000;
    return Math.round(((end - start) / 3_600_000) * 100) / 100;
};
const wageAmount = (w: Salary) =>
    `${currencySymbol(w.currency ?? undefined)}${(w.hourlyPayRate ?? 0).toLocaleString()}/hr`;

interface ShiftForm {
    shiftName: string;
    employerId: string;
    startTime: string;
    endTime: string;
    typeChoice: string;
    customType: string;
    color: string;
    notes: string;
}
const emptyForm = (): ShiftForm => ({
    shiftName: '', employerId: '', startTime: '09:00', endTime: '17:00',
    typeChoice: 'day', customType: '', color: SHIFT_COLORS[0], notes: '',
});

export default function ShiftsScreen() {
    const dispatch = useDispatch<AppDispatch>();
    // Everything comes from the shared preloaded cache — instant, no per-screen fetch.
    const shifts = useSelector((s: RootState) => s.data.shifts);
    const employers = useSelector((s: RootState) => s.data.employers);
    const wages = useSelector((s: RootState) => s.data.wages);
    const loaded = useSelector((s: RootState) => s.data.loaded);
    const loading = !loaded;

    // The one global currency drives every wage — changed only in Settings.
    const globalCurrency = useSelector((s: RootState) => s.settings.currency);

    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Shift | null>(null);
    const [form, setForm] = useState<ShiftForm>(emptyForm());
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Add/Edit Wages — single step (employee is inherited from the shift).
    // `editingWage` non-null means we're editing an existing wage.
    const [wageOpen, setWageOpen] = useState(false);
    const [editingWage, setEditingWage] = useState<Salary | null>(null);
    const [wageShiftId, setWageShiftId] = useState('');
    const [wageValue, setWageValue] = useState('');
    const [wageSaving, setWageSaving] = useState(false);

    const [wageDeleteTarget, setWageDeleteTarget] = useState<Salary | null>(null);
    const [wageDeleting, setWageDeleting] = useState(false);

    // Re-pull shifts + wages + analytics after any change (they interrelate).
    const syncShiftData = useCallback(() => {
        dispatch(refreshShifts());
        dispatch(refreshWages());
        dispatch(refreshAnalytics());
    }, [dispatch]);

    // Fill the cache if the user deep-linked here before the layout preload ran.
    useEffect(() => { dispatch(loadAllData()); }, [dispatch]);

    const employerName = (id?: string | null) =>
        employers.find((e) => e.id === id)?.employerName ?? 'Unassigned';

    const openCreate = () => {
        setEditing(null);
        setForm({ ...emptyForm(), employerId: employers[0]?.id ?? '' });
        setModalOpen(true);
    };
    const openEdit = (shift: Shift) => {
        setEditing(shift);
        const type = shift.shiftType ?? 'day';
        const isPreset = PRESET_TYPES.includes(type);
        setForm({
            shiftName: shift.shiftName ?? '',
            employerId: shift.employerId ?? '',
            startTime: toTimeInput(shift.startTime),
            endTime: toTimeInput(shift.endTime),
            typeChoice: isPreset ? type : 'custom',
            customType: isPreset ? '' : type,
            color: shift.color ?? SHIFT_COLORS[0],
            notes: shift.notes ?? '',
        });
        setModalOpen(true);
    };

    const resolvedType = () => (form.typeChoice === 'custom' ? form.customType.trim() : form.typeChoice);

    const submit = async () => {
        if (!form.employerId) return notify('Error', 'Select the employee for this shift');
        if (!form.startTime || !form.endTime) return notify('Error', 'Start and end time are required');
        const type = resolvedType();
        if (!type) return notify('Error', 'Enter a name for your custom shift type');
        setSaving(true);
        try {
            const base = {
                shiftName: form.shiftName.trim() || undefined,
                employerId: form.employerId,
                startTime: combineISO(form.startTime),
                endTime: combineISO(form.endTime),
                shiftType: type,
                color: form.color,
                notes: form.notes.trim() || undefined,
            };
            if (editing) await updateShift(editing.id, base);
            else await createShift(base);
            setModalOpen(false);
            syncShiftData();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteShift(deleteTarget.id);
            setDeleteTarget(null);
            syncShiftData();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const openWages = () => {
        setEditingWage(null); setWageShiftId(''); setWageValue(''); setWageOpen(true);
    };
    const openEditWage = (wage: Salary) => {
        setEditingWage(wage);
        setWageShiftId(wage.shiftId ?? '');
        setWageValue(wage.hourlyPayRate != null ? String(wage.hourlyPayRate) : '');
        setWageOpen(true);
    };
    const submitWage = async () => {
        if (!wageShiftId) return notify('Error', 'Select a shift');
        const rate = Number(wageValue);
        if (!wageValue || isNaN(rate) || rate < 0) return notify('Error', 'Enter a valid hourly rate');
        setWageSaving(true);
        try {
            // Currency always follows the global setting — never chosen per wage.
            if (editingWage) {
                await updateSalary(editingWage.id, { shiftId: wageShiftId, hourlyPayRate: rate, rateType: 'hourly', currency: globalCurrency });
            } else {
                await createSalary({ shiftId: wageShiftId, hourlyPayRate: rate, rateType: 'hourly', currency: globalCurrency });
            }
            setWageOpen(false);
            syncShiftData();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Failed to save wage');
        } finally {
            setWageSaving(false);
        }
    };
    const confirmDeleteWage = async () => {
        if (!wageDeleteTarget) return;
        setWageDeleting(true);
        try {
            await deleteSalary(wageDeleteTarget.id);
            setWageDeleteTarget(null);
            syncShiftData();
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Delete failed');
        } finally {
            setWageDeleting(false);
        }
    };

    const shiftLabel = (s?: Shift | Salary['shift']) =>
        s ? s.shiftName || `${s.shiftType ?? 'Shift'}` : 'Shift';

    const wageShift = shifts.find((s) => s.id === wageShiftId);
    const wagePerDay = wageShift && wageValue && !isNaN(Number(wageValue)) ? Number(wageValue) * (wageShift.totalHours ?? 0) : null;

    const filteredShifts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return shifts;
        return shifts.filter((s) =>
            [(s.shiftName ?? ''), (s.notes ?? ''), (s.shiftType ?? ''), (s.employer?.employerName ?? '')].some((v) => v.toLowerCase().includes(q)));
    }, [shifts, search]);

    const filteredWages = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return wages;
        return wages.filter((w) =>
            (w.employer?.employerName ?? '').toLowerCase().includes(q) ||
            (w.shift?.shiftName ?? '').toLowerCase().includes(q) ||
            (w.shift?.shiftType ?? '').toLowerCase().includes(q));
    }, [wages, search]);

    const formHours = hoursBetween(form.startTime, form.endTime);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader
                title="Shifts"
                subtitle={`${shifts.length} PRESET${shifts.length === 1 ? '' : 'S'}`}
                rightAction={
                    <TouchableOpacity onPress={openCreate} style={styles.headerBtn}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                }
            />

            <View style={styles.controls}>
                <SegmentedTabs options={FILTERS} value={filter} onChange={setFilter} />
                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={16} color={COLORS.outline} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={filter === 'wages' ? 'Search wages…' : 'Search shifts…'}
                        placeholderTextColor={COLORS.outline}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
                ) : filter === 'wages' ? (
                    filteredWages.length === 0 ? (
                        <EmptyState icon="wallet-outline" title="No wages yet" subtitle="Use “Add Wages” to set the hourly rate for a shift." actionLabel="Add Wages" onAction={openWages} />
                    ) : (
                        filteredWages.map((w) => (
                            <Card key={w.id} style={styles.wageCard}>
                                <View style={styles.wageTop}>
                                    <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.wageIcon}>
                                        <Ionicons name="business" size={18} color="#fff" />
                                    </LinearGradient>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.wageShift} numberOfLines={1}>{shiftLabel(w.shift)}</Text>
                                        <Text style={styles.wageEmp} numberOfLines={1}>{w.employer?.employerName ?? 'Unassigned'}</Text>
                                    </View>
                                </View>
                                <View style={styles.wageBottom}>
                                    <Text style={styles.wageToday}>Per day {money(w.salary)}</Text>
                                    <Text style={styles.wageRate}>{wageAmount(w)}</Text>
                                </View>
                                <View style={styles.shiftActions}>
                                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditWage(w)} activeOpacity={0.7}>
                                        <Ionicons name="create-outline" size={15} color={COLORS.primary} />
                                        <Text style={styles.editText}>EDIT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.delBtn} onPress={() => setWageDeleteTarget(w)} activeOpacity={0.7}>
                                        <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                                        <Text style={styles.delText}>DELETE</Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))
                    )
                ) : shifts.length === 0 ? (
                    <EmptyState icon="calendar-outline" title="No shifts yet" subtitle="Create a shift preset, then assign it to days on the calendar." actionLabel="Add Your First Shift" onAction={openCreate} />
                ) : filteredShifts.length === 0 ? (
                    <Text style={styles.noMatch}>No shifts match your search.</Text>
                ) : (
                    filteredShifts.map((shift) => (
                        <Card key={shift.id} padding={0} style={styles.shiftCard}>
                            <View style={[styles.shiftAccent, { backgroundColor: shift.color ?? COLORS.primary }]} />
                            <View style={{ padding: 16 }}>
                                <View style={styles.shiftHead}>
                                    <View style={[styles.shiftIcon, { backgroundColor: shift.color ?? COLORS.primary }]}>
                                        <Ionicons name="calendar" size={18} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.shiftTitle} numberOfLines={1}>{shift.shiftName || (shift.shiftType ?? 'Shift')}</Text>
                                        <Text style={styles.shiftTime}>
                                            {fmtTime(shift.startTime)} – {fmtTime(shift.endTime)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.statsStrip}>
                                    <View style={[styles.statCell, { borderRightWidth: 1, borderRightColor: 'rgba(0,94,163,0.08)' }]}>
                                        <Text style={styles.statCellLabel}>HOURS</Text>
                                        <Text style={styles.statCellVal}>{shift.totalHours}h</Text>
                                    </View>
                                    <View style={styles.statCell}>
                                        <Text style={styles.statCellLabel}>EMPLOYEE</Text>
                                        <Text style={styles.statCellVal} numberOfLines={1}>{shift.employer?.employerName ?? employerName(shift.employerId)}</Text>
                                    </View>
                                </View>

                                {shift.shiftType ? (
                                    <View style={{ marginBottom: 12 }}>
                                        <Badge label={shift.shiftType} color={COLORS.onSurfaceVar} bg={COLORS.surfaceContainer} />
                                    </View>
                                ) : null}

                                <View style={styles.shiftActions}>
                                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(shift)} activeOpacity={0.7}>
                                        <Ionicons name="create-outline" size={15} color={COLORS.primary} />
                                        <Text style={styles.editText}>EDIT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.delBtn} onPress={() => setDeleteTarget(shift)} activeOpacity={0.7}>
                                        <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                                        <Text style={styles.delText}>DELETE</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Card>
                    ))
                )}

                {!loading && filter !== 'wages' && shifts.length > 0 && (
                    <TouchableOpacity style={styles.addWagesBtn} onPress={openWages} activeOpacity={0.7}>
                        <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.addWagesText}>ADD WAGES</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <BottomNav active="shifts" />

            {/* Create / Edit modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Shift' : 'Add Shift'}
                footer={<ModalActions onCancel={() => setModalOpen(false)} onConfirm={submit} confirmLabel={editing ? 'Save Changes' : 'Save Shift'} loading={saving} />}
            >
                <Text style={styles.fieldLabel}>SHIFT NAME (OPTIONAL)</Text>
                <TextInput style={styles.input} placeholder="e.g. Morning Floor" placeholderTextColor={COLORS.outline} value={form.shiftName} onChangeText={(t) => setForm({ ...form, shiftName: t })} />

                <View style={{ marginTop: 14 }}>
                    {employers.length === 0 ? (
                        <>
                            <Text style={styles.fieldLabel}>EMPLOYEE</Text>
                            <Text style={styles.warnNote}>No employees yet — add one on the Employers screen first.</Text>
                        </>
                    ) : (
                        <SelectField label="Employee" value={form.employerId} placeholder="Select an employee…" onChange={(v) => setForm({ ...form, employerId: v })}
                            options={employers.map((e) => ({ value: e.id, label: `${e.employerName} — ${e.store}` }))} />
                    )}
                </View>

                <View style={styles.rowGap}>
                    <TimeField label="Start Time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} />
                    <TimeField label="End Time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} />
                </View>

                <View style={[styles.rowGap, { marginTop: 14 }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>TOTAL HOURS (AUTO)</Text>
                        <View style={styles.autoField}><Text style={styles.autoText}>{formHours}h</Text></View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <SelectField
                            label="Shift Type"
                            value={form.typeChoice}
                            onChange={(v) => setForm({ ...form, typeChoice: v })}
                            options={[...PRESET_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) })), { value: 'custom', label: 'Custom…' }]}
                        />
                    </View>
                </View>

                {form.typeChoice === 'custom' && (
                    <View style={{ marginTop: 14 }}>
                        <Text style={styles.fieldLabel}>CUSTOM TYPE NAME</Text>
                        <TextInput style={styles.input} placeholder="e.g. Split, On-call…" placeholderTextColor={COLORS.outline} value={form.customType} onChangeText={(t) => setForm({ ...form, customType: t })} />
                    </View>
                )}

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>LABEL COLOUR</Text>
                <View style={styles.colorRow}>
                    {SHIFT_COLORS.map((c) => (
                        <TouchableOpacity key={c} onPress={() => setForm({ ...form, color: c })} style={[styles.swatch, { backgroundColor: c }, form.color === c && styles.swatchActive]} />
                    ))}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>NOTES (OPTIONAL)</Text>
                <TextInput style={[styles.input, styles.textarea]} multiline value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} placeholderTextColor={COLORS.outline} />
            </Modal>

            {/* Add Wages modal — single step (employee inherited from the shift) */}
            <Modal
                open={wageOpen}
                onClose={() => setWageOpen(false)}
                title={editingWage ? 'Edit Wage' : 'Add Wages'}
                footer={<ModalActions onCancel={() => setWageOpen(false)} onConfirm={submitWage} confirmLabel={editingWage ? 'Save Changes' : 'Create Wages'} loading={wageSaving} />}
            >
                <View style={{ marginBottom: 14 }}>
                    {shifts.length === 0 ? (
                        <Text style={styles.warnNote}>Create a shift first.</Text>
                    ) : (
                        <SelectField label="Shift" value={wageShiftId} placeholder="Select a shift…" onChange={setWageShiftId}
                            options={shifts.map((s) => ({ value: s.id, label: `${shiftLabel(s)} · ${s.employer?.employerName ?? employerName(s.employerId)} · ${fmtTime(s.startTime)}–${fmtTime(s.endTime)}` }))} />
                    )}
                    {wageShift ? (
                        <Text style={styles.rateHint}>Wage will be assigned to {wageShift.employer?.employerName ?? employerName(wageShift.employerId)}.</Text>
                    ) : null}
                </View>
                {/* Currency is fixed to the global setting — not chosen per wage.
                    Change it once in Settings and every wage follows. */}
                <View style={{ marginBottom: 14 }}>
                    <Text style={styles.fieldLabel}>CURRENCY</Text>
                    <View style={styles.currencyFixed}>
                        <Text style={styles.currencyFixedText}>{globalCurrency} ({currencySymbol(globalCurrency).trim()})</Text>
                        <Text style={styles.currencyFixedBadge}>GLOBAL</Text>
                    </View>
                    <Text style={styles.rateHint}>Uses your global currency. Change it in Settings.</Text>
                </View>
                <Text style={styles.fieldLabel}>HOURLY RATE</Text>
                <View style={styles.rateWrap}>
                    <Text style={styles.rateSymbol}>{currencySymbol(globalCurrency)}</Text>
                    <TextInput style={styles.rateInput} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.outline} value={wageValue} onChangeText={setWageValue} />
                </View>
                <Text style={styles.rateHint}>Amount paid per hour.</Text>

                <View style={styles.previewCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.previewCardLabel}>PER-DAY SALARY</Text>
                        <Text style={styles.previewCardSub}>
                            {wageShift ? `${wageShift.totalHours ?? 0}h × ${currencySymbol(globalCurrency)}${wageValue || 0}/hr` : 'Pick a shift'}
                        </Text>
                    </View>
                    <Text style={styles.previewCardVal}>
                        {wagePerDay == null ? '—' : `${currencySymbol(globalCurrency)}${(Math.round(wagePerDay * 100) / 100).toLocaleString()}`}
                    </Text>
                </View>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete shift?"
                message={`Delete this shift preset? Its wages and any days it was assigned to are removed too — the employee's total pay updates accordingly.`}
                confirmLabel="Delete"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={!!wageDeleteTarget}
                title="Delete wage?"
                message="Remove this hourly rate? The shift keeps its hours but no longer contributes pay until you add a new wage."
                confirmLabel="Delete"
                destructive
                loading={wageDeleting}
                onConfirm={confirmDeleteWage}
                onCancel={() => setWageDeleteTarget(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceLowest, borderWidth: 1, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 14 },
    noMatch: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.outline, textAlign: 'center', marginTop: 40 },

    shiftCard: { overflow: 'hidden' },
    shiftAccent: { height: 5, width: '100%' },
    shiftHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    shiftIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    shiftTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 2 },
    shiftTime: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline },
    statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(0,94,163,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(0,94,163,0.06)', padding: 10, marginBottom: 12 },
    statCell: { flex: 1, alignItems: 'center' },
    statCellLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4, marginBottom: 2 },
    statCellVal: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    shiftActions: { flexDirection: 'row', gap: 10 },
    editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(0,94,163,0.15)' },
    editText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
    delBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)' },
    delText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.error, letterSpacing: 0.5 },

    wageCard: {},
    wageTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    wageIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    wageShift: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 2 },
    wageEmp: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline },
    wageBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,94,163,0.06)', paddingTop: 12 },
    wageToday: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4 },
    wageRate: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary },

    addWagesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(0,94,163,0.2)', marginTop: 2 },
    addWagesText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.6 },

    fieldLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    input: { backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    textarea: { height: 72, textAlignVertical: 'top' },
    rowGap: { flexDirection: 'row', gap: 12, marginTop: 14 },
    autoField: { backgroundColor: COLORS.surfaceContainer, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 50, justifyContent: 'center' },
    autoText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },
    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    swatch: { width: 34, height: 34, borderRadius: 17 },
    swatchActive: { borderWidth: 3, borderColor: COLORS.primary },

    warnNote: { fontSize: 12, fontFamily: FONTS.medium, color: '#b45309' },
    currencyFixed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 50 },
    currencyFixedText: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.primary },
    currencyFixedBadge: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.6 },
    rateWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 50 },
    rateSymbol: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.outline, marginRight: 6 },
    rateInput: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    rateHint: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline, marginTop: 6 },
    previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,94,163,0.05)', borderWidth: 1, borderColor: 'rgba(0,94,163,0.08)', borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
    previewCardLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.6 },
    previewCardSub: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline, marginTop: 2 },
    previewCardVal: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.primary },
});
