import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput,
    ActivityIndicator, Switch,
} from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import { Modal, ConfirmDialog, ModalActions } from '../../components/ui/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
    loadAllData,
    refreshEmployers,
    refreshCalendar,
    refreshAnalytics,
    refreshPaidMonths,
    setDefaultEmployerThunk,
} from '../../store/slices/dataSlice';
import { Employer, Salary } from '../../lib/types';
import { createEmployer, updateEmployer, deleteEmployer, EmployerInput } from '../../lib/services/employers';
import { money, currencySymbol, fmtTime } from '../../lib/format';

const MAX_EMPLOYERS = 3;

type Filter = 'all' | 'active' | 'inactive';
const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

const emptyForm: EmployerInput = { employerName: '', store: '', notes: '', isActive: true };
const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export default function EmployersScreen() {
    const dispatch = useDispatch<AppDispatch>();
    // Read from the shared cache; switching the default here re-scopes the app.
    const employers = useSelector((s: RootState) => s.data.employers);
    const salaries = useSelector((s: RootState) => s.data.wages);
    const defaultEmployerId = useSelector((s: RootState) => s.data.defaultEmployerId);
    const loaded = useSelector((s: RootState) => s.data.loaded);
    const loading = !loaded;

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Employer | null>(null);
    const [form, setForm] = useState<EmployerInput>(emptyForm);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Employer | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [shiftsTarget, setShiftsTarget] = useState<Employer | null>(null);
    const [settingDefault, setSettingDefault] = useState<string | null>(null);

    useEffect(() => { dispatch(loadAllData()); }, [dispatch]);

    const makeDefault = async (emp: Employer) => {
        if (emp.id === defaultEmployerId || settingDefault) return;
        setSettingDefault(emp.id);
        try {
            await dispatch(setDefaultEmployerThunk(emp.id)).unwrap();
            notify('Default updated', `${emp.employerName} is now your default employee`);
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Could not set default');
        } finally {
            setSettingDefault(null);
        }
    };

    // A wage only counts while its shift preset still exists (deleting a shift
    // removes its wages; this also guards against any orphaned rows).
    const liveSalaries = useMemo(() => salaries.filter((s) => s.shiftId && s.shift), [salaries]);

    const statsByEmployer = useMemo(() => {
        const map = new Map<string, { shiftIds: Set<string>; totalPay: number; rows: Salary[] }>();
        for (const sal of liveSalaries) {
            if (!sal.employerId) continue;
            const entry = map.get(sal.employerId) ?? { shiftIds: new Set<string>(), totalPay: 0, rows: [] };
            if (sal.shiftId) entry.shiftIds.add(sal.shiftId);
            entry.totalPay += sal.salary ?? 0;
            entry.rows.push(sal);
            map.set(sal.employerId, entry);
        }
        return map;
    }, [liveSalaries]);

    const summary = useMemo(() => ({
        total: employers.length,
        active: employers.filter((e) => e.isActive).length,
        totalPay: liveSalaries.reduce((a, s) => a + (s.salary ?? 0), 0),
    }), [employers, liveSalaries]);

    const filteredEmployers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employers.filter((e) => {
            if (filter === 'active' && !e.isActive) return false;
            if (filter === 'inactive' && e.isActive) return false;
            if (!q) return true;
            return e.employerName.toLowerCase().includes(q) || e.store.toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q);
        });
    }, [employers, filter, search]);

    const atLimit = employers.length >= MAX_EMPLOYERS;

    const openCreate = () => {
        if (atLimit) return notify('Limit reached', `You can add a maximum of ${MAX_EMPLOYERS} employees.`);
        setEditing(null);
        setForm(emptyForm);
        setModalOpen(true);
    };
    const openEdit = (emp: Employer) => {
        setEditing(emp);
        setForm({ employerName: emp.employerName, store: emp.store, notes: emp.notes ?? '', isActive: emp.isActive });
        setModalOpen(true);
    };

    const submit = async () => {
        if (!form.employerName.trim() || !form.store.trim()) return notify('Error', 'Employer name and store are required');
        setSaving(true);
        try {
            const payload: EmployerInput = {
                employerName: form.employerName.trim(),
                store: form.store.trim(),
                notes: form.notes?.trim() || undefined,
                isActive: form.isActive,
            };
            if (editing) await updateEmployer(editing.id, payload);
            else await createEmployer(payload);
            setModalOpen(false);
            dispatch(refreshEmployers());
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
            await deleteEmployer(deleteTarget.id);
            setDeleteTarget(null);
            // Deleting may hand the default to another → re-scope everything.
            dispatch(refreshEmployers());
            dispatch(refreshCalendar());
            dispatch(refreshAnalytics());
            dispatch(refreshPaidMonths());
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const targetShifts = shiftsTarget ? (statsByEmployer.get(shiftsTarget.id)?.rows ?? []).filter((s) => s.shift) : [];

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader
                title="Employers"
                subtitle={`${employers.length}/${MAX_EMPLOYERS} ADDED`}
                rightAction={
                    <TouchableOpacity onPress={openCreate} style={[styles.headerBtn, atLimit && { opacity: 0.5 }]}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                }
            />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={16} color={COLORS.outline} />
                    <TextInput style={styles.searchInput} placeholder="Search employers…" placeholderTextColor={COLORS.outline} value={search} onChangeText={setSearch} />
                </View>
                <SegmentedTabs options={FILTERS} value={filter} onChange={setFilter} />

                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summary}>
                    <View style={styles.sumCell}>
                        <Text style={styles.sumVal}>{summary.total}</Text>
                        <Text style={styles.sumLabel}>TOTAL</Text>
                    </View>
                    <View style={[styles.sumCell, styles.sumBorder]}>
                        <Text style={styles.sumVal}>{summary.active}</Text>
                        <Text style={styles.sumLabel}>ACTIVE</Text>
                    </View>
                    <View style={styles.sumCell}>
                        <Text style={styles.sumVal}>{money(summary.totalPay)}</Text>
                        <Text style={styles.sumLabel}>TOTAL PAY</Text>
                    </View>
                </LinearGradient>

                {atLimit && (
                    <View style={styles.limitBanner}>
                        <Text style={styles.limitText}>You&apos;ve reached the maximum of {MAX_EMPLOYERS} employees. Delete one to add another.</Text>
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : employers.length === 0 ? (
                    <EmptyState icon="business-outline" title="No employers yet" subtitle="Add your first employer to start tracking shifts and pay." actionLabel="Add Your First Employer" onAction={openCreate} />
                ) : filteredEmployers.length === 0 ? (
                    <Text style={styles.noMatch}>No employers match your filters.</Text>
                ) : (
                    filteredEmployers.map((emp) => {
                        const stat = statsByEmployer.get(emp.id);
                        const shiftCount = stat?.shiftIds.size ?? 0;
                        const totalPay = stat?.totalPay ?? 0;
                        return (
                            <Card key={emp.id} padding={0} style={styles.empCard}>
                                <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.empAccent} />
                                <View style={{ padding: 16 }}>
                                    <View style={styles.empHead}>
                                        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.empAvatar}>
                                            <Text style={styles.empAvatarText}>{initials(emp.employerName)}</Text>
                                        </LinearGradient>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.empNameRow}>
                                                <Text style={styles.empName} numberOfLines={1}>{emp.employerName}</Text>
                                                <View style={[styles.statusDot, { backgroundColor: emp.isActive ? '#10b981' : COLORS.outlineVar }]} />
                                                {emp.id === defaultEmployerId && (
                                                    <View style={styles.defaultBadge}>
                                                        <Ionicons name="star" size={9} color="#006d30" />
                                                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.empStoreRow}>
                                                <Ionicons name="location-outline" size={12} color={COLORS.outline} />
                                                <Text style={styles.empStore} numberOfLines={1}>{emp.store}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.statsStrip}>
                                        <View style={styles.statCell}>
                                            <Text style={styles.statCellLabel}>SHIFTS</Text>
                                            <Text style={styles.statCellVal}>{shiftCount}</Text>
                                        </View>
                                        <View style={[styles.statCell, { borderLeftWidth: 1, borderLeftColor: 'rgba(0,94,163,0.08)' }]}>
                                            <Text style={styles.statCellLabel}>TOTAL PAY</Text>
                                            <Text style={[styles.statCellVal, { color: COLORS.primary }]}>{money(totalPay)}</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity onPress={() => setShiftsTarget(emp)} activeOpacity={0.85} style={{ marginBottom: 10 }}>
                                        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.viewShiftsBtn}>
                                            <Ionicons name="calendar-outline" size={14} color="#fff" />
                                            <Text style={styles.viewShiftsText}>VIEW SHIFTS</Text>
                                            <Ionicons name="chevron-forward" size={14} color="#fff" />
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    {/* set default (scopes calendar / earnings / reports) */}
                                    <TouchableOpacity
                                        onPress={() => makeDefault(emp)}
                                        disabled={emp.id === defaultEmployerId || !!settingDefault}
                                        activeOpacity={0.7}
                                        style={[styles.defaultBtn, emp.id === defaultEmployerId && styles.defaultBtnActive]}
                                    >
                                        {settingDefault === emp.id ? (
                                            <ActivityIndicator size="small" color="#006d30" />
                                        ) : (
                                            <Ionicons name={emp.id === defaultEmployerId ? 'star' : 'star-outline'} size={14} color="#006d30" />
                                        )}
                                        <Text style={styles.defaultBtnText}>
                                            {emp.id === defaultEmployerId ? 'DEFAULT EMPLOYEE' : 'SET AS DEFAULT'}
                                        </Text>
                                    </TouchableOpacity>

                                    <View style={styles.empActions}>
                                        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(emp)} activeOpacity={0.7}>
                                            <Ionicons name="create-outline" size={15} color={COLORS.primary} />
                                            <Text style={styles.editText}>EDIT</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.delBtn} onPress={() => setDeleteTarget(emp)} activeOpacity={0.7}>
                                            <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                                            <Text style={styles.delText}>DELETE</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Card>
                        );
                    })
                )}
            </ScrollView>
            <BottomNav active="more" />

            {/* Create / Edit */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Employer' : 'Add Employer'}
                footer={<ModalActions onCancel={() => setModalOpen(false)} onConfirm={submit} confirmLabel={editing ? 'Save Changes' : 'Save Employer'} loading={saving} />}
            >
                <Text style={styles.fieldLabel}>EMPLOYER NAME</Text>
                <TextInput style={styles.input} placeholder="e.g. Tesco PLC" placeholderTextColor={COLORS.outline} value={form.employerName} onChangeText={(t) => setForm({ ...form, employerName: t })} />
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>STORE / LOCATION</Text>
                <TextInput style={styles.input} placeholder="e.g. High Street" placeholderTextColor={COLORS.outline} value={form.store} onChangeText={(t) => setForm({ ...form, store: t })} />
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>NOTES (OPTIONAL)</Text>
                <TextInput style={[styles.input, styles.textarea]} multiline placeholder="Anything to remember…" placeholderTextColor={COLORS.outline} value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} />
                <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Active employer</Text>
                    <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} trackColor={{ true: COLORS.primary, false: COLORS.outlineVar }} thumbColor="#fff" />
                </View>
            </Modal>

            {/* View Shifts */}
            <Modal open={!!shiftsTarget} onClose={() => setShiftsTarget(null)} title={shiftsTarget ? `${shiftsTarget.employerName} — Shifts` : 'Shifts'}>
                {targetShifts.length === 0 ? (
                    <Text style={styles.emptyNote}>No shifts assigned to this employer yet.</Text>
                ) : (
                    targetShifts.map((sal) => {
                        const sh = sal.shift!;
                        return (
                            <View key={sal.id} style={styles.shiftRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.shiftRowTop}>
                                        <Text style={styles.shiftRowDate}>{sh.shiftName || sh.shiftType || 'Shift'}</Text>
                                    </View>
                                    <Text style={styles.shiftRowTime}>
                                        {fmtTime(sh.startTime)} – {fmtTime(sh.endTime)}{sh.totalHours != null ? ` · ${sh.totalHours}h` : ''}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.shiftRowPay}>{money(sal.salary)}</Text>
                                    {sal.hourlyPayRate != null && <Text style={styles.shiftRowRate}>{currencySymbol()}{sal.hourlyPayRate}/h</Text>}
                                </View>
                            </View>
                        );
                    })
                )}
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete employer?"
                message={`Delete "${deleteTarget?.employerName}"? Its shifts are kept; linked salary rows have their employer cleared.`}
                confirmLabel="Delete"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 14 },

    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceLowest, borderWidth: 1, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },

    summary: { flexDirection: 'row', borderRadius: RADIUS.lg, padding: 18, ...SHADOW.button },
    sumCell: { flex: 1, alignItems: 'center' },
    sumBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    sumVal: { fontSize: 22, fontFamily: FONTS.bold, color: '#fff' },
    sumLabel: { fontSize: 9, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.6, marginTop: 4 },

    limitBanner: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: RADIUS.md, padding: 12 },
    limitText: { fontSize: 13, fontFamily: FONTS.medium, color: '#b45309' },
    noMatch: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.outline, textAlign: 'center', marginTop: 40 },

    empCard: { overflow: 'hidden' },
    empAccent: { height: 5, width: '100%' },
    empHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    empAvatar: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    empAvatarText: { fontSize: 14, fontFamily: FONTS.bold, color: '#fff' },
    empNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    empName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onSurface, flexShrink: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    empStoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    empStore: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline, flex: 1 },

    statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(0,94,163,0.04)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(0,94,163,0.06)', padding: 10, marginBottom: 12 },
    statCell: { flex: 1, alignItems: 'center' },
    statCellLabel: { fontSize: 9, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.4, marginBottom: 2 },
    statCellVal: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.onSurface },

    viewShiftsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: RADIUS.sm },
    viewShiftsText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff', letterSpacing: 0.6 },
    defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,109,48,0.1)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    defaultBadgeText: { fontSize: 8, fontFamily: FONTS.bold, color: '#006d30', letterSpacing: 0.5 },
    defaultBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(0,109,48,0.25)', marginBottom: 10 },
    defaultBtnActive: { backgroundColor: 'rgba(0,109,48,0.1)', borderColor: 'transparent' },
    defaultBtnText: { fontSize: 11, fontFamily: FONTS.bold, color: '#006d30', letterSpacing: 0.5 },
    empActions: { flexDirection: 'row', gap: 10 },
    editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(0,94,163,0.15)' },
    editText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
    delBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)' },
    delText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.error, letterSpacing: 0.5 },

    fieldLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    input: { backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    textarea: { height: 80, textAlignVertical: 'top' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
    toggleLabel: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.onSurface },

    emptyNote: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.outline, textAlign: 'center', paddingVertical: 24 },
    shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(0,94,163,0.08)', borderRadius: RADIUS.md, padding: 12, marginBottom: 10 },
    shiftRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    shiftRowDate: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.onSurface },
    shiftRowTime: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.outline },
    shiftRowPay: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.primary },
    shiftRowRate: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.outline },
});
