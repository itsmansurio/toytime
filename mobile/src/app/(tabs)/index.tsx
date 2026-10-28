import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { api, type EventItem } from '../../lib/api';
import { useRefresh } from '../../lib/useRefresh';
import { colors, radius } from '../../lib/theme';
import { formatDate, pluralGuests } from '../../lib/format';
import { Button, EmptyState, ErrorText, Ionicons, Pill, SectionTitle, T } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';

function status(e: EventItem) {
  if (e.paymentStatus !== 'paid') return { label: 'Черновик', color: colors.amber, bg: colors.amberLight };
  if (!e.invitesSentAt) return { label: 'Оплачено', color: '#42642D', bg: '#EDF5E7' };
  return { label: 'Отправлено', color: colors.yes, bg: colors.yesLight };
}

function EventCard({ item }: { item: EventItem }) {
  const s = item.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  const open = () => router.push(`/event/${item.id}`);
  return (
    <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <T weight="extrabold" size={19} numberOfLines={2} style={{ marginBottom: 6 }}>{item.title}</T>
          <View style={styles.meta}><Ionicons name="time-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted}>{formatDate(item.eventDate)} · {item.eventTime}</T></View>
          <View style={styles.meta}><Ionicons name="location-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>{item.address}</T></View>
        </View>
        <Pill {...status(item)} />
      </View>
      <View style={styles.stats}>
        <Stat value={s.yes} label="Придут" />
        <Stat value={s.no} label="Отказались" />
        <Stat value={s.pending} label="Ожидаем" />
      </View>
      <Button title={s.total ? `Управлять гостями · ${pluralGuests(s.total)}` : 'Добавить гостей'} variant="light" size="md" icon="arrow-forward"
        onPress={() => router.push(`/event/${item.id}/guests`)} style={{ marginTop: 14 }} />
    </Pressable>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <T weight="extrabold" size={22} style={{ letterSpacing: -0.5 }}>{value}</T>
      <T size={11} color={colors.muted}>{label}</T>
    </View>
  );
}

export default function Events() {
  const { data, error, loading } = useRefresh(api.events);
  const events = data ?? [];
  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
      data={events}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <>
          <TopHeader title={'Той начинается\nс хорошей организации.'} subtitle="Приглашения, ответы гостей и напоминания — в одном месте." />
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <ErrorText>{error}</ErrorText>
            {events.length ? <SectionTitle right={pluralEvents(events.length)}>Ваши мероприятия</SectionTitle> : null}
          </View>
        </>
      }
      ListEmptyComponent={loading ? undefined : (
        <EmptyState icon="calendar-outline" title="Пока нет мероприятий" text="Создайте той, свадьбу или день рождения — и пригласите гостей за пару минут." />
      )}
      ListFooterComponent={loading ? undefined : (
        <View style={{ paddingHorizontal: 16, marginTop: events.length ? 4 : 24 }}>
          <Button title="Создать мероприятие" icon="add" onPress={() => router.push('/event/new')} />
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={16} color="#53663A" />
            <T size={12} color="#53663A" style={{ flex: 1 }}>Без рекламы. 1000 ₸ за мероприятие — гостям ничего устанавливать не нужно.</T>
          </View>
        </View>
      )}
      renderItem={({ item }) => <View style={{ paddingHorizontal: 16 }}><EventCard item={item} /></View>}
    />
  );
}

function pluralEvents(n: number) {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? 'мероприятие' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'мероприятия' : 'мероприятий';
  return `${n} ${w}`;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 10 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.goldLight, borderRadius: 14, padding: 12, marginTop: 12 },
});
