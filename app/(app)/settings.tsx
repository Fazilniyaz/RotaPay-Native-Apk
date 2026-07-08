import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput,
    ActivityIndicator, Image,
} from 'react-native';
import { notify } from '../../lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { logoutThunk, setUser } from '../../store/slices/authSlice';
import { loadSettings, saveSettings, uploadPhoto, removePhoto } from '../../store/slices/settingsSlice';
import { getRate } from '../../lib/services/currency';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import { ConfirmDialog } from '../../components/ui/Modal';
import { deleteAccount } from '../../lib/services/settings';
import { CURRENCIES, currencySymbol, DateFormat, TimeFormat } from '../../lib/format';

const DATE_FORMATS: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const localeFor = (f: string) => (f === 'MM/DD/YYYY' ? 'en-US' : f === 'YYYY-MM-DD' ? 'sv-SE' : 'en-GB');
const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

export default function SettingsScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const settings = useSelector((s: RootState) => s.settings);
    const user = useSelector((s: RootState) => s.auth.user);

    const [displayName, setDisplayName] = useState('');
    const [currency, setCurrency] = useState('GBP');
    const [nativeCurrency, setNativeCurrency] = useState('GBP');
    const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY');
    const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');
    const [reportMonths, setReportMonths] = useState(1);
    const [clockInType, setClockInType] = useState<'automatic' | 'manual'>('automatic');
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
    const [removeFlag, setRemoveFlag] = useState(false);
    const [saving, setSaving] = useState(false);

    const [rate, setRate] = useState<number | null>(null);
    const [rateLoading, setRateLoading] = useState(false);

    // Delete-account flow — two-step: a tap opens a confirm dialog; only the
    // confirm actually deletes (destructive + irreversible).
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    // Hydrate local form from the settings slice once it has loaded.
    useEffect(() => { dispatch(loadSettings()); }, [dispatch]);
    useEffect(() => {
        if (!settings.loaded) return;
        setDisplayName(settings.displayName);
        setCurrency(settings.currency);
        setNativeCurrency(settings.nativeCurrency);
        setDateFormat(settings.dateFormat);
        setTimeFormat(settings.timeFormat);
        setReportMonths(settings.reportMonths);
        setClockInType(settings.clockInType);
    }, [settings.loaded]);

    useEffect(() => {
        if (currency === nativeCurrency) { setRate(1); return; }
        let active = true;
        setRateLoading(true);
        getRate(currency, nativeCurrency)
            .then((r) => active && setRate(r.rate))
            .catch(() => active && setRate(null))
            .finally(() => active && setRateLoading(false));
        return () => { active = false; };
    }, [currency, nativeCurrency]);

    const currentPhoto = pendingPhoto ?? (removeFlag ? null : settings.profilePicture);

    const settingsChanged =
        displayName.trim() !== settings.displayName || currency !== settings.currency ||
        nativeCurrency !== settings.nativeCurrency || dateFormat !== settings.dateFormat ||
        timeFormat !== settings.timeFormat || reportMonths !== settings.reportMonths ||
        clockInType !== settings.clockInType;
    const photoChanged = pendingPhoto !== null || removeFlag;
    const dirty = settingsChanged || photoChanged;

    const pickPhoto = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return notify('Permission needed', 'Allow photo access to change your picture.');
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
            base64: true,
        });
        if (res.canceled || !res.assets?.[0]?.base64) return;
        const asset = res.assets[0];
        const mime = asset.mimeType ?? 'image/jpeg';
        setPendingPhoto(`data:${mime};base64,${asset.base64}`);
        setRemoveFlag(false);
    };

    const save = async () => {
        if (displayName.trim().length < 2) return notify('Error', 'Display name must be at least 2 characters');
        if (!dirty) return;
        setSaving(true);
        try {
            let latestPhoto = settings.profilePicture;
            if (pendingPhoto) {
                const r = await dispatch(uploadPhoto(pendingPhoto)).unwrap();
                latestPhoto = r.profile.profilePicture;
            } else if (removeFlag) {
                const r = await dispatch(removePhoto()).unwrap();
                latestPhoto = r.profile.profilePicture;
            }
            if (settingsChanged) {
                await dispatch(saveSettings({ displayName: displayName.trim(), currency, nativeCurrency, dateFormat, timeFormat, reportMonths, clockInType })).unwrap();
            }
            setPendingPhoto(null);
            setRemoveFlag(false);
            if (user) dispatch(setUser({ ...user, displayName: displayName.trim(), profilePicture: latestPhoto ?? undefined }));
            notify('Saved', 'Settings saved');
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await dispatch(logoutThunk());
        router.replace('/(auth)/login');
    };

    // Runs only after the user confirms. Deletes the account, then logs out
    // (which resets every Redux slice) and returns to login.
    const handleDeleteAccount = async () => {
        setDeletingAccount(true);
        try {
            await deleteAccount();
            setDeleteOpen(false);
            notify('Account deleted', 'Your account has been removed.');
            await dispatch(logoutThunk());
            router.replace('/(auth)/login');
        } catch (err: any) {
            notify('Error', err?.response?.data?.message || 'Could not delete account');
            setDeletingAccount(false);
        }
    };

    const now = new Date();
    const previewDate = now.toLocaleDateString(localeFor(dateFormat), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const previewTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' });
    const previewMoney = `${currencySymbol(currency)}1,234.50`;

    const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: `${c} (${currencySymbol(c).trim()})` }));

    if (!settings.loaded) {
        return (
            <SafeAreaView style={styles.screen}>
                <AppHeader title="Settings" subtitle="PROFILE & PREFERENCES" />
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
                <BottomNav active="more" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader title="Settings" subtitle="PROFILE & PREFERENCES" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile */}
                <Card>
                    <View style={styles.cardHead}>
                        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.cardHeadIcon}>
                            <Ionicons name="person" size={16} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.cardHeadTitle}>Profile</Text>
                    </View>

                    <View style={styles.profileRow}>
                        {currentPhoto ? (
                            <Image source={{ uri: currentPhoto }} style={styles.avatar} />
                        ) : (
                            <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials(displayName || 'U')}</Text>
                            </LinearGradient>
                        )}
                        <View style={{ flex: 1, gap: 8 }}>
                            <View style={styles.photoBtns}>
                                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.7}>
                                    <Ionicons name="camera-outline" size={14} color={COLORS.primary} />
                                    <Text style={styles.photoBtnText}>{currentPhoto ? 'CHANGE' : 'UPLOAD'}</Text>
                                </TouchableOpacity>
                                {currentPhoto && (
                                    <TouchableOpacity style={styles.photoBtnDanger} onPress={() => { setPendingPhoto(null); setRemoveFlag(true); }} activeOpacity={0.7}>
                                        <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                                        <Text style={styles.photoBtnDangerText}>REMOVE</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={styles.photoHint}>JPG/PNG · max 5MB. Saved on Save Changes.</Text>
                        </View>
                    </View>

                    <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
                    <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={COLORS.outline} />
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>EMAIL</Text>
                    <View style={[styles.input, styles.disabledInput]}>
                        <Text style={styles.disabledText}>{settings.email}</Text>
                    </View>
                    <Text style={styles.hint}>Email can&apos;t be changed here.</Text>
                </Card>

                {/* Preferences */}
                <Card>
                    <View style={styles.cardHead}>
                        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} style={styles.cardHeadIcon}>
                            <Ionicons name="globe-outline" size={16} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.cardHeadTitle}>Global Preferences</Text>
                    </View>

                    <View style={{ gap: 14 }}>
                        <SelectField label="Global Currency" value={currency} onChange={setCurrency} options={currencyOptions} />
                        <SelectField label="Native Currency" value={nativeCurrency} onChange={setNativeCurrency} options={currencyOptions} />
                        <SelectField label="Date Format" value={dateFormat} onChange={(v) => setDateFormat(v as DateFormat)} options={DATE_FORMATS.map((f) => ({ value: f, label: f }))} />
                        <SelectField label="Time Format" value={timeFormat} onChange={(v) => setTimeFormat(v as TimeFormat)} options={[{ value: '24h', label: '24-hour' }, { value: '12h', label: '12-hour' }]} />
                        <SelectField label="Report Range" value={String(reportMonths)} onChange={(v) => setReportMonths(Number(v))} options={[{ value: '1', label: 'Last 1 month' }, { value: '3', label: 'Last 3 months' }]} />
                        <SelectField label="Clock-in Type" value={clockInType} onChange={(v) => setClockInType(v as 'automatic' | 'manual')} options={[{ value: 'automatic', label: 'Automatic' }, { value: 'manual', label: 'Manual' }]} />
                    </View>

                    {/* Currency comparison */}
                    <View style={styles.previewBox}>
                        <Text style={styles.previewLabel}>CURRENCY COMPARISON</Text>
                        {currency === nativeCurrency ? (
                            <Text style={styles.previewMuted}>Global and native currencies are the same ({currency}).</Text>
                        ) : rateLoading ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator color={COLORS.primary} size="small" />
                                <Text style={styles.previewMuted}>Fetching live rate…</Text>
                            </View>
                        ) : rate == null ? (
                            <Text style={[styles.previewMuted, { color: COLORS.error }]}>Live rate unavailable right now.</Text>
                        ) : (
                            <Text style={styles.previewValue}>
                                1 {currency} → {rate.toFixed(2)} {nativeCurrency}   ·   {currencySymbol(currency)}100 = {currencySymbol(nativeCurrency)}{(100 * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        )}
                    </View>

                    {/* Live preview */}
                    <View style={styles.previewBox}>
                        <Text style={styles.previewLabel}>PREVIEW</Text>
                        <Text style={styles.previewValue}>{previewMoney}    {previewDate}    {previewTime}</Text>
                    </View>
                </Card>

                {/* Actions */}
                <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={save} loading={saving} disabled={!dirty} style={{ marginTop: 4 }} />
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                    <Text style={styles.logoutText}>LOG OUT</Text>
                </TouchableOpacity>

                {/* Danger Zone — permanent account deletion (two-step: confirm first) */}
                <Card style={styles.dangerCard}>
                    <View style={styles.cardHead}>
                        <View style={styles.dangerIcon}>
                            <Ionicons name="warning-outline" size={16} color="#fff" />
                        </View>
                        <Text style={styles.dangerTitle}>Danger Zone</Text>
                    </View>
                    <Text style={styles.dangerBody}>
                        Deleting your account permanently removes your profile, shifts, wages, employees,
                        calendar, clock history and reports. This cannot be undone.
                    </Text>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteOpen(true)} activeOpacity={0.8}>
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={styles.deleteText}>DELETE ACCOUNT</Text>
                    </TouchableOpacity>
                </Card>
            </ScrollView>
            <BottomNav active="more" />

            <ConfirmDialog
                open={deleteOpen}
                title="Delete your account?"
                message="This permanently deletes your account and ALL of your data — shifts, wages, employees, calendar, clock history and reports. This cannot be undone."
                confirmLabel="Delete Account"
                destructive
                loading={deletingAccount}
                onConfirm={handleDeleteAccount}
                onCancel={() => setDeleteOpen(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 14 },

    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    cardHeadIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cardHeadTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.onSurface },

    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
    avatar: { width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontFamily: FONTS.bold, color: '#fff' },
    photoBtns: { flexDirection: 'row', gap: 8 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(58,146,149,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 8 },
    photoBtnText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },
    photoBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 8 },
    photoBtnDangerText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.error, letterSpacing: 0.5 },
    photoHint: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline },

    fieldLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.onSurfaceVar, marginBottom: 6 },
    input: { backgroundColor: COLORS.surfaceContainer, borderWidth: 1.5, borderColor: COLORS.outlineVar, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    disabledInput: { justifyContent: 'center', opacity: 0.6 },
    disabledText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurface },
    hint: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.outline, marginTop: 6 },

    previewBox: { backgroundColor: 'rgba(58,146,149,0.04)', borderWidth: 1, borderColor: 'rgba(58,146,149,0.06)', borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
    previewLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.8, marginBottom: 8 },
    previewValue: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.onSurface, lineHeight: 20 },
    previewMuted: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.outline },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(186,26,26,0.3)', borderRadius: RADIUS.md },
    logoutText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.error, letterSpacing: 0.8 },

    dangerCard: { borderWidth: 1, borderColor: 'rgba(186,26,26,0.35)', backgroundColor: 'rgba(186,26,26,0.05)' },
    dangerIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.error },
    dangerTitle: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.error },
    dangerBody: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 19, marginBottom: 14 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: RADIUS.md, backgroundColor: COLORS.error },
    deleteText: { fontSize: 11, fontFamily: FONTS.bold, color: '#fff', letterSpacing: 0.8 },
});
