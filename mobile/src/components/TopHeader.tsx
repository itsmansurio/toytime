import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { useSession } from '../lib/session';
import { useRefresh } from '../lib/useRefresh';
import { Ionicons, T } from './ui';

// Тёмно-зелёная шапка со скруглением снизу — как в макете заказчика.
export function Brand({ size = 23 }: { size?: number }) {
  return (
    <T weight="extrabold" size={size} color="#fff" style={{ letterSpacing: -0.8 }}>
      Toy<T weight="extrabold" size={size} color={colors.lime}>Time</T>
    </T>
  );
}

export function TopHeader({ title = 'Той начинается\nс хорошей организации.', subtitle = 'Приглашения, ответы гостей и напоминания — в одном месте.', children }: {
  title?: string; subtitle?: string; children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { config } = useSession();
  const demo = config?.testMode.whatsapp || config?.testMode.payments;
  const { data: notes } = useRefresh(api.notifications, 15000);
  const unread = (notes ?? []).filter((n) => !n.read).length;
  return (
    <View style={[styles.top, { paddingTop: insets.top + 22 }]}>
      <View style={styles.line}>
        <Brand />
        <View style={styles.right}>
          <View style={styles.tag}><T weight="semibold" size={11} color="#E3EEE8">{demo ? 'БЕЗ РЕКЛАМЫ · ДЕМО' : 'БЕЗ РЕКЛАМЫ'}</T></View>
          <Pressable style={styles.icon} onPress={() => router.push('/notifications')} accessibilityLabel="Уведомления" hitSlop={6}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            {unread ? <View style={styles.badge}><T weight="bold" size={9} color={colors.green} style={{ lineHeight: 12 }}>{unread > 9 ? '9+' : unread}</T></View> : null}
          </Pressable>
          <Pressable style={styles.icon} onPress={() => router.push('/settings')} accessibilityLabel="Настройки" hitSlop={6}>
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
      <T weight="extrabold" size={25} color="#fff" style={styles.title}>{title}</T>
      <T size={13} color="#C6D8D0">{subtitle}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.green, paddingHorizontal: 19, paddingBottom: 25, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { borderWidth: 1, borderColor: '#FFFFFF44', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 28, marginTop: 25, marginBottom: 8, maxWidth: 340, letterSpacing: -0.6 },
});
