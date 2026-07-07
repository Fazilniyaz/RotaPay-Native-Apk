import React, { useState } from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDeviceIntegrity } from '../../hooks/useDeviceIntegrity';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';

// Blocks the app on a rooted / jailbroken device (blueprint point 3 — restrict
// sensitive features when the environment is compromised). Emulators are NOT
// blocked so dev/CI keep working. Because expo-device's check is experimental
// and can false-positive, we offer an explicit "Continue anyway" so a genuine
// user is never permanently locked out — but the warning is deliberately loud
// and sensitive actions can additionally use `useDeviceIntegrity()` to disable
// themselves. Flip ALLOW_BYPASS to false for a hard block.
const ALLOW_BYPASS = true;

export function DeviceIntegrityGate() {
    const { compromised, ready, reasons } = useDeviceIntegrity();
    const [acknowledged, setAcknowledged] = useState(false);

    const visible = ready && compromised && !acknowledged;

    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="warning" size={30} color="#fff" />
                    </View>
                    <Text style={styles.title}>Security warning</Text>
                    <Text style={styles.body}>
                        This device appears to be {reasons.join(', ').toLowerCase() || 'compromised'}.
                        On rooted / jailbroken devices your tokens and personal data can no longer be
                        protected by the operating system, so RotoPay restricts sensitive features here.
                    </Text>

                    {!ready ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
                    ) : ALLOW_BYPASS ? (
                        <TouchableOpacity
                            style={styles.btn}
                            activeOpacity={0.85}
                            onPress={() => setAcknowledged(true)}
                        >
                            <Text style={styles.btnText}>I UNDERSTAND, CONTINUE</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.blocked}>Access blocked on this device.</Text>
                    )}
                </View>
            </View>
        </RNModal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
    card: { width: '100%', maxWidth: 400, backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, padding: 24, alignItems: 'center' },
    iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 19, fontFamily: FONTS.bold, color: COLORS.error, marginBottom: 10 },
    body: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 21, textAlign: 'center' },
    btn: { marginTop: 20, backgroundColor: COLORS.error, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 20, alignSelf: 'stretch', alignItems: 'center' },
    btnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#fff', letterSpacing: 0.6 },
    blocked: { marginTop: 20, fontSize: 13, fontFamily: FONTS.bold, color: COLORS.error },
});
