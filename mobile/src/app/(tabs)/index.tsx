import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useRefresh } from '../../lib/useRefresh';
import { colors } from '../../lib/theme';
import { formatDate, pluralGuests } from '../../lib/format';
import { Button, Card, ErrorText } from '../../components/ui';

const PAYMENT_LABEL = { unpaid: 'Не оплачено', pending: 'Ожидает оплаты', paid: 'Оплачено' } as const;

export default function Events() {
  const { data, error, loading } = useRefresh(api.events);
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        data={data ?? []}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={<ErrorText>{error}</ErrorText>}
        ListEmptyComponent={loading ? undefined : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Пока нет мероприятий</Text>
            <Text style={styles.emptyText}>Создайте той, свадьбу или день рождения и пригласите гостей за пару минут.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/event/${item.id}`)} accessibilityRole="button">
            <Card>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>📅 {formatDate(item.eventDate)} · {item.eventTime}</Text>
              <Text style={styles.meta} numberOfLines={1}>📍 {item.address}</Text>
              <Text style={styles.meta}>👥 {pluralGuests(item.stats?.total ?? 0)}</Text>
              <View style={styles.row}>
                <Text style={[styles.pill, { color: colors.green }]}>Придут: {item.stats?.yes ?? 0}</Text>
                <Text style={[styles.pill, { color: colors.red }]}>Не придут: {item.stats?.no ?? 0}</Text>
                <Text style={[styles.pill, { color: colors.muted }]}>Молчат: {item.stats?.pending ?? 0}</Text>
              </View>
              {item.paymentStatus !== 'paid' ? <Text style={styles.payment}>{PAYMENT_LABEL[item.paymentStatus]}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
      <View style={styles.fab}>
        <Button title="+  Создать мероприятие" onPress={() => router.push('/event/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  meta: { color: colors.muted, fontSize: 14, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pill: { fontSize: 13, fontWeight: '600', backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  payment: { marginTop: 10, color: '#8A6100', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, color: colors.text },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  fab: { position: 'absolute', left: 16, right: 16, bottom: 20 },
});
