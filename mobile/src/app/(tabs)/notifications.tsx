import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type NotificationItem } from '../../lib/api';
import { useRefresh } from '../../lib/useRefresh';
import { colors, radius, shadow } from '../../lib/theme';
import { EmptyState, ErrorText, IconTile, T, type IconName } from '../../components/ui';

function kind(text: string): { icon: IconName; color: string; bg: string } {
  if (text.includes(' не сможет прийти')) return { icon: 'close', color: colors.red, bg: colors.redLight };
  if (text.includes(' придёт')) return { icon: 'checkmark', color: colors.green, bg: colors.greenLight };
  if (text.startsWith('Оплата')) return { icon: 'card', color: colors.gold, bg: colors.goldLight };
  return { icon: 'alert', color: colors.amber, bg: colors.amberLight };
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'только что';
  if (diff < 60) return `${Math.floor(diff)} мин назад`;
  if (diff < 24 * 60) return `${Math.floor(diff / 60)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function Item({ item }: { item: NotificationItem }) {
  const k = kind(item.text);
  return (
    <Pressable onPress={() => item.eventId && router.push(`/event/${item.eventId}`)} style={styles.item}>
      <IconTile name={k.icon} color={k.color} bg={k.bg} size={40} />
      <View style={{ flex: 1 }}>
        <T weight={item.read ? 'medium' : 'semibold'} size={15}>{item.text}</T>
        <T size={12} color={colors.muted} style={{ marginTop: 3 }}>{timeAgo(item.createdAt)}</T>
      </View>
      {!item.read ? <View style={styles.unread} /> : null}
    </Pressable>
  );
}

export default function Notifications() {
  const { data, error, loading } = useRefresh(api.notifications);
  useFocusEffect(useCallback(() => () => { api.markNotificationsRead().catch(() => {}); }, []));
  return (
    <FlatList
      contentContainerStyle={{ padding: 16, paddingTop: 4, flexGrow: 1 }}
      data={data ?? []}
      keyExtractor={(n) => String(n.id)}
      ListHeaderComponent={<ErrorText>{error}</ErrorText>}
      ListEmptyComponent={loading ? undefined : (
        <EmptyState icon="notifications-outline" title="Пока тихо" text="Здесь появятся ответы гостей, подтверждения оплаты и статусы рассылки." />
      )}
      renderItem={({ item }) => <Item item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: radius.md, marginBottom: 10, ...shadow, shadowOpacity: 0.04 },
  unread: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
});
