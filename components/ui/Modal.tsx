import React from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS } from '../../constants/theme';
import Button from './Button';

// Bottom-sheet modal — title bar, scrollable body, optional sticky footer.
// The RN counterpart of the web app's <Modal>.
export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const insets = useSafeAreaInsets();
    return (
        <RNModal visible={open} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.grabber} />
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                            <Ionicons name="close" size={20} color={COLORS.outline} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.body}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>
                    {footer ? <View style={styles.footer}>{footer}</View> : null}
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

// Confirmation dialog (centered) — title, message, cancel/confirm actions.
export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    loading,
    destructive,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <RNModal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.centerOverlay}>
                <Pressable style={styles.backdrop} onPress={onCancel} />
                <View style={styles.dialog}>
                    <Text style={styles.dialogTitle}>{title}</Text>
                    <Text style={styles.dialogMsg}>{message}</Text>
                    <View style={styles.dialogActions}>
                        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        {destructive ? (
                            <TouchableOpacity
                                onPress={onConfirm}
                                disabled={loading}
                                style={[styles.destructiveBtn, loading && { opacity: 0.6 }]}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.destructiveText}>{loading ? 'Working…' : confirmLabel}</Text>
                            </TouchableOpacity>
                        ) : (
                            <Button title={confirmLabel} onPress={onConfirm} loading={loading} style={{ flex: 1 }} />
                        )}
                    </View>
                </View>
            </View>
        </RNModal>
    );
}

// Footer helper: a Cancel + primary action pair for <Modal>.
export function ModalActions({
    onCancel,
    onConfirm,
    confirmLabel,
    loading,
    cancelLabel = 'Cancel',
}: {
    onCancel: () => void;
    onConfirm: () => void;
    confirmLabel: string;
    loading?: boolean;
    cancelLabel?: string;
}) {
    return (
        <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <Button title={confirmLabel} onPress={onConfirm} loading={loading} style={{ flex: 2 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    centerOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: COLORS.surfaceLowest,
        borderTopLeftRadius: RADIUS.xxl,
        borderTopRightRadius: RADIUS.xxl,
        paddingHorizontal: 20,
        paddingTop: 8,
        maxHeight: '90%',
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.outlineVar,
        alignSelf: 'center',
        marginBottom: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.onSurface },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: { marginBottom: 8 },
    footer: { flexDirection: 'row', gap: 12, paddingTop: 12 },
    modalActions: { flexDirection: 'row', gap: 12, flex: 1 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.outlineVar,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.onSurfaceVar, letterSpacing: 0.5 },
    dialog: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.surfaceLowest,
        borderRadius: RADIUS.xl,
        padding: 24,
    },
    dialogTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.onSurface, marginBottom: 8 },
    dialogMsg: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.onSurfaceVar, lineHeight: 20, marginBottom: 20 },
    dialogActions: { flexDirection: 'row', gap: 12 },
    destructiveBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    destructiveText: { fontSize: 14, fontFamily: FONTS.bold, color: '#fff' },
});
