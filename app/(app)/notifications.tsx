import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { markRead, markAllRead, removeNotification } from '../../store/slices/notificationsSlice';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';
import AppHeader from '../../components/layout/AppHeader';
import BottomNav from '../../components/layout/BottomNav';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import { activityMeta } from '../../lib/activityMeta';
import { timeAgo } from '../../lib/format';

export default function NotificationsScreen() {
    const dispatch = useDispatch<AppDispatch>();
    const { items, unread, loaded } = useSelector((s: RootState) => s.notifications);

    return (
        <SafeAreaView style={styles.screen}>
            <AppHeader
                title="Notifications"
                subtitle={unread > 0 ? `${unread} UNREAD` : 'ALL CAUGHT UP'}
                showBack
                rightAction={
                    unread > 0 ? (
                        <TouchableOpacity onPress={() => dispatch(markAllRead())} style={styles.headerBtn}>
                            <Ionicons name="checkmark-done" size={22} color="#fff" />
                        </TouchableOpacity>
                    ) : <View style={{ width: 38 }} />
                }
            />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {!loaded ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
                ) : items.length === 0 ? (
                    <EmptyState icon="notifications-outline" title="No notifications" subtitle="Your recent activity will show up here." />
                ) : (
                    items.map((n) => {
                        const meta = activityMeta(n.type);
                        return (
                            <TouchableOpacity
                                key={n.id}
                                activeOpacity={0.7}
                                onPress={() => { if (!n.isRead) dispatch(markRead(n.id)); }}
                            >
                                <Card padding={0} style={[styles.card, !n.isRead && styles.cardUnread]}>
                                    <View style={styles.row}>
                                        <View style={[styles.iconBubble, { backgroundColor: meta.bg }]}>
                                            <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.titleRow}>
                                                <Text style={styles.title}>{n.title}</Text>
                                                {!n.isRead && <View style={styles.unreadDot} />}
                                            </View>
                                            <Text style={styles.message}>{n.message}</Text>
                                            <Text style={styles.time}>{timeAgo(n.scheduledAt ?? n.createdAt)}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => dispatch(removeNotification(n.id))} hitSlop={8} style={styles.delBtn}>
                                            <Ionicons name="trash-outline" size={18} color={COLORS.outline} />
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
            <BottomNav active="more" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.surface },
    headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24, gap: 12 },
    card: { overflow: 'hidden' },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
    iconBubble: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.onSurface },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
    message: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, marginTop: 2, lineHeight: 18 },
    time: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.outline, letterSpacing: 0.6, marginTop: 6 },
    delBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
