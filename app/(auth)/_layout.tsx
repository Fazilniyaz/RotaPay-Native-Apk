import { Stack } from 'expo-router';

// No `animation` override here: a fade transition keeps the outgoing and incoming
// screens mounted at once, which trips a Fabric view re-parenting crash
// ("addViewAt: ... child already has a parent") on register -> email-sent.
export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
