import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type NotificationItem } from '../../lib/api';
import { useRefresh } from '../../lib/useRefresh';
import { colors, radius } from '../../lib/theme';
import { EmptyState, ErrorText, HeaderRow, IconTile, T, type IconName } from '../../components/ui';
import { useCurrentEvent } from '../../lib/current';
import { TopHeader } from '../../components/TopHeader';

function kind(text: string): { icon: IconName; color: string; bg: string } {
  if (text.includes(' не сможет прийти')) return { icon: 'close', color: colors.red, bg: colors.redLight };
  if (text.includes(' придёт')) return { icon: 'checkmark', color: colors.green, bg: colors.greenLight };
  if (text.startsWith('Оплата')) return { icon: 'card', color: '#53663A', bg: colors.goldLight };
  return { icon: 'alert', color: colors.amber, bg: colors.amberLight };
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'только что';
  if (diff < 60) return `${Math.floor(diff)} мин назад`;
  if (diff < 24 * 60) return `${Math.floor(diff / 60)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function Item({ item, onOpen }: { item: NotificationItem; onOpen: (eventId: string) => void }) {
  const k = kind(item.text);
  return (
    <Pressable onPress={() => item.eventId && onOpen(item.eventId)} style={styles.item}>
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
  const { setCurrentId } = useCurrentEvent(60000);
  useFocusEffect(useCallback(() => () => { api.markNotificationsRead().catch(() => {}); }, []));
  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
      data={data ?? []}
      keyExtractor={(n) => String(n.id)}
      ListHeaderComponent={<><TopHeader title="Уведомления" subtitle="Ответы гостей, оплата и статусы рассылки." /><View style={{ paddingHorizontal: 16, paddingTop: 16 }}><HeaderRow onBack={() => router.navigate('/')} /><ErrorText>{error}</ErrorText></View></>}
      ListEmptyComponent={loading ? undefined : (
        <EmptyState icon="notifications-outline" title="Пока тихо" text="Здесь появятся ответы гостей, подтверждения оплаты и статусы рассылки." />
      )}
      renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><Item item={item} onOpen={(eventId) => { setCurrentId(eventId); router.navigate('/guests'); }} /></View>}
    />
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: radius.lg, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  unread: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
});
