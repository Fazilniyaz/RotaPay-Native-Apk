import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

// ─────────────────────────────────────────────
// First-run product tour (native). A short, skippable, step-by-step card
// carousel that explains the essentials — creating an employee, a shift and
// wages — mirroring the web app's walkthrough. Shows once per user
// (AsyncStorage); can be replayed from Settings via restartProductTour().
// Colours/typography come from the shared theme tokens so it always matches
// the current brand palette.
// ─────────────────────────────────────────────

const TOUR_VERSION = 'v1';
const storageKey = (userId?: string) => `rp_tour_${TOUR_VERSION}_${userId || 'anon'}`;
const RESTART_EVENT = 'rp:tour:restart';

// Call from a "Replay tutorial" button to run the tour again.
export function restartProductTour() {
    DeviceEventEmitter.emit(RESTART_EVENT);
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
interface Step {
    icon: IconName;
    title: string;
    body: string;
}

const STEPS: Step[] = [
    {
        icon: 'sparkles',
        title: 'Welcome to RotaPay 👋',
        body: "Let's take 30 seconds to show you the essentials — creating an employee, a shift and wages. You can skip anytime.",
    },
    {
        icon: 'business',
        title: '1. Add your employees',
        body: 'Open Employers to add a workplace or person you track hours and pay for. Your first one becomes the default scope for everything.',
    },
    {
        icon: 'time',
        title: '2. Create shift presets',
        body: 'In Shifts, build reusable shifts (day, night, rotational) once — then drop them onto any date instead of retyping the times.',
    },
    {
        icon: 'cash',
        title: '3. Set wages on a shift',
        body: 'While creating a shift, add its pay rate (hourly or fixed). RotaPay uses it to total your earnings automatically.',
    },
    {
        icon: 'calendar',
        title: '4. Schedule on the calendar',
        body: 'Assign your shift presets to real dates to build your rota. Everything you plan feeds earnings and reports.',
    },
    {
        icon: 'timer',
        title: '5. Clock in & out',
        body: 'Track live worked hours from Clock In/Out. Your clocked time flows straight into earnings and reports.',
    },
    {
        icon: 'ribbon',
        title: "You're all set! 🎉",
        body: 'Head to Employers to add your first employee. You can replay this walkthrough anytime from Settings.',
    },
];

export function ProductTour() {
    const loaded = useSelector((s: RootState) => s.data.loaded);
    const employers = useSelector((s: RootState) => s.data.employers);
    const user = useSelector((s: RootState) => s.auth.user);

    const [visible, setVisible] = useState(false);
    const [index, setIndex] = useState(0);

    // Auto-start once, after the cache loads and the onboarding gate is satisfied
    // (user already has ≥1 employee), only if never seen before.
    useEffect(() => {
        let cancelled = false;
        if (!loaded || employers.length === 0 || visible) return;
        (async () => {
            try {
                const seen = await AsyncStorage.getItem(storageKey(user?.id));
                if (!cancelled && !seen) {
                    setIndex(0);
                    setVisible(true);
                }
            } catch {
                /* storage unavailable — skip the tour silently */
            }
        })();
        return () => { cancelled = true; };
    }, [loaded, employers.length, user?.id, visible]);

    // Manual replay (from Settings).
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(RESTART_EVENT, () => {
            setIndex(0);
            setVisible(true);
        });
        return () => sub.remove();
    }, []);

    const finish = async () => {
        try { await AsyncStorage.setItem(storageKey(user?.id), Date.now().toString()); } catch { /* ignore */ }
        setVisible(false);
    };

    const next = () => (index >= STEPS.length - 1 ? finish() : setIndex((i) => i + 1));
    const back = () => setIndex((i) => Math.max(0, i - 1));

    if (!visible) return null;
    const step = STEPS[index];
    const isLast = index >= STEPS.length - 1;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Skip */}
                    {!isLast && (
                        <TouchableOpacity onPress={finish} style={styles.skip} hitSlop={10}>
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    )}

                    <LinearGradient
                        colors={[COLORS.gradStart, COLORS.gradEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconBadge}
                    >
                        <Ionicons name={step.icon} size={26} color="#fff" />
                    </LinearGradient>

                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.body}>{step.body}</Text>

                    {/* Progress dots */}
                    <View style={styles.dots}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === index && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        {index > 0 ? (
                            <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.7}>
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.backBtn} />
                        )}
                        <TouchableOpacity onPress={next} activeOpacity={0.85} style={styles.nextWrap}>
                            <LinearGradient
                                colors={[COLORS.gradStart, COLORS.gradEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextBtn}
                            >
                                <Text style={styles.nextText}>{isLast ? 'Finish' : 'Next'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(29,78,216,0.55)',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.surfaceLowest,
        borderRadius: RADIUS.xl,
        padding: 24,
        paddingTop: 28,
    },
    skip: { position: 'absolute', top: 14, right: 16, zIndex: 2, padding: 4 },
    skipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.onSurfaceVar },
    iconBadge: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 19, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 8 },
    body: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 21, marginBottom: 20 },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.outlineVar },
    dotActive: { width: 18, backgroundColor: COLORS.primaryMid },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    backBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    backText: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.onSurfaceVar },
    nextWrap: { flex: 1 },
    nextBtn: { paddingVertical: 15, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    nextText: { fontSize: 14, fontFamily: FONTS.bold, color: '#fff' },
});
