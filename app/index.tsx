import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { loadStoredAuth } from '../store/slices/authSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';

export default function SplashPage() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        const init = async () => {
            const result = await dispatch(loadStoredAuth());
            const authed =
                loadStoredAuth.fulfilled.match(result) &&
                !!result.payload.token &&
                !!result.payload.user;
            setTimeout(() => {
                router.replace(authed ? '/(app)/dashboard' : '/(auth)/login');
            }, 1500);
        };
        init();
    }, []);

    return (
        <LinearGradient colors={[COLORS.gradStart, COLORS.gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
            <View style={styles.logoBox}>
                <Text style={styles.logoEmoji}>💳</Text>
            </View>
            <Text style={styles.brand}>RotoPay</Text>
            <Text style={styles.tagline}>Financial & scheduling management</Text>
            <ActivityIndicator color="rgba(255,255,255,0.7)" style={{ marginTop: 48 }} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logoBox: {
        width: 96, height: 96, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    },
    logoEmoji: { fontSize: 44 },
    brand:    { fontSize: 34, fontFamily: FONTS.extraBold, color: '#fff', letterSpacing: -0.5 },
    tagline:  { fontSize: 14, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
});
