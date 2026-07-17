import { Stack } from 'expo-router';

// animation: 'none' — the Fabric view-recycling crash ("addViewAt: ... child
// already has a parent", react-native-screens #3249) fires during the fragment
// transition between screens. Skipping the transition removes the trigger.
export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
