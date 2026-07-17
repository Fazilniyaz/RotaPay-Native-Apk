import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { loadSettings } from '../../store/slices/settingsSlice';
import { loadStoredAuth } from '../../store/slices/authSlice';
import { loadAllData, refreshEmployers } from '../../store/slices/dataSlice';
import { useNotificationsSync } from '../../hooks/useNotificationsSync';
import { OnboardingGate } from '../../components/onboarding/OnboardingGate';
import { ProductTour } from '../../components/onboarding/ProductTour';
import { DeviceIntegrityGate } from '../../components/security/DeviceIntegrityGate';
import { loadRuntimeConfig } from '../../lib/runtimeConfig';
import { checkDeviceIntegrity } from '../../lib/deviceIntegrity';

export default function AppLayout() {
    const dispatch = useDispatch<AppDispatch>();
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
    const [ready, setReady] = useState(false);

    // Restore any persisted session before trusting `isAuthenticated` — covers a
    // reload / deep-link straight into an app screen (web especially). This also
    // primes the in-memory token so requests are authorised immediately.
    useEffect(() => {
        dispatch(loadStoredAuth()).finally(() => setReady(true));
    }, [dispatch]);

    // No valid session → send to login instead of firing endless 401s.
    useEffect(() => {
        if (ready && !isAuthenticated) router.replace('/(auth)/login');
    }, [ready, isAuthenticated]);

    // Run the device root/jailbreak check once as the app section mounts.
    useEffect(() => {
        checkDeviceIntegrity();
    }, []);

    // One notifications poller + a single settings load for the whole app section.
    useNotificationsSync();
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(loadSettings());
            // Employers first, on their own: the onboarding gate only needs these,
            // so this lets it decide right away rather than sitting behind the
            // full preload below (which waits on every module).
            dispatch(refreshEmployers());
            // Preload every module's data once so tab switches are instant
            // (screens read from the shared cache instead of re-fetching).
            dispatch(loadAllData());
            // Fetch non-secret runtime config post-auth (no secrets in the binary).
            loadRuntimeConfig();
        }
    }, [dispatch, isAuthenticated]);

    return (
        <>
            {/* animation: 'none' — the Fabric view-recycling crash ("addViewAt: ...
                child already has a parent", react-native-screens #3249) fires during
                the fragment transition between screens. Skipping the transition
                removes the trigger. */}
            <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
            {/* Restricts the app on a rooted/jailbroken device (point 3). */}
            <DeviceIntegrityGate />
            {/* Blocks the app until the first (default) employee is created. */}
            <OnboardingGate />
            {/* First-run, skippable walkthrough (employee → shift → wages → calendar → clock). */}
            <ProductTour />
        </>
    );
}
