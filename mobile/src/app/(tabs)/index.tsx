import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { api, type EventItem } from '../../lib/api';
import { useRefresh } from '../../lib/useRefresh';
import { colors, radius, shadow } from '../../lib/theme';
import { pluralGuests } from '../../lib/format';
import { Button, EmptyState, ErrorText, Ionicons, Pill, ResponseBar, T } from '../../components/ui';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function status(e: EventItem) {
  if (e.paymentStatus !== 'paid') return { label: 'Ждёт оплаты', color: colors.amber, bg: colors.amberLight, icon: 'card-outline' as const };
  if (!e.invitesSentAt) return { label: 'Оплачено', color: colors.green, bg: colors.greenLight, icon: 'checkmark' as const };
  return { label: 'Приглашения отправлены', color: colors.green, bg: colors.greenLight, icon: 'paper-plane-outline' as const };
}

function EventCard({ item }: { item: EventItem }) {
  const [, m, d] = item.eventDate.split('-').map(Number);
  const s = item.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  const st = status(item);
  return (
    <Pressable onPress={() => router.push(`/event/${item.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={styles.top}>
        <View style={styles.date}>
          <T weight="extrabold" size={24} color="#fff" style={{ lineHeight: 28 }}>{d}</T>
          <T weight="semibold" size={12} color="#CFE6D8">{MONTHS[m - 1]}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={17} numberOfLines={2}>{item.title}</T>
          <View style={styles.meta}><Ionicons name="time-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted}>{item.eventTime}</T></View>
          <View style={styles.meta}><Ionicons name="location-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>{item.address}</T></View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      </View>
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <T weight="semibold" size={13} color={colors.textSoft}>{pluralGuests(s.total)}</T>
        <Pill {...st} />
      </View>
      {s.total ? (
        <>
          <ResponseBar yes={s.yes} no={s.no} pending={s.pending} />
          <View style={styles.legend}>
            <Legend color={colors.green} label={`Придут ${s.yes}`} />
            <Legend color={colors.red} label={`Не придут ${s.no}`} />
            <Legend color="#C5CFC9" label={`Молчат ${s.pending}`} />
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T size={12} weight="medium" color={colors.muted}>{label}</T>
    </View>
  );
}

export default function Events() {
  const { data, error, loading } = useRefresh(api.events);
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push('/event/new')} style={styles.add} accessibilityLabel="Создать мероприятие">
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 }}
      data={data ?? []}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={<ErrorText>{error}</ErrorText>}
      ListEmptyComponent={loading ? undefined : (
        <EmptyState icon="calendar-outline" title="Пока нет мероприятий" text="Создайте той, свадьбу или день рождения — и пригласите гостей за пару минут.">
          <Button title="Создать мероприятие" icon="add" onPress={() => router.push('/event/new')} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        </EmptyState>
      )}
      renderItem={({ item }) => <EventCard item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginRight: 16, ...shadow, shadowOpacity: 0.2 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, marginBottom: 14, ...shadow },
  top: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  date: { width: 58, height: 64, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
});
