import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { EventItem } from '../../lib/api';
import { eventStatus } from '../../lib/status';
import { useCurrentEvent } from '../../lib/current';
import { useSession } from '../../lib/session';
import { colors, radius } from '../../lib/theme';
import { formatDate, pluralGuests } from '../../lib/format';
import { Button, Card, ErrorText, Ionicons, Muted, Notice, Pill, ResponseBar, SectionTitle, Stats, T } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';

function daysLeft(e: EventItem) {
  return Math.ceil((new Date(e.startsAt).getTime() - Date.now()) / 86400000);
}

function countdown(e: EventItem) {
  const d = daysLeft(e);
  if (d < 0) return 'Праздник прошёл';
  if (d === 0) return 'Сегодня!';
  const m10 = d % 10, m100 = d % 100;
  const w = m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
  return `До тоя ${d} ${w}`;
}

// Итоги для ресторана и родных: кто придёт, кто нет, кто молчит.
async function shareSummary(e: EventItem) {
  const s = e.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  await Share.share({
    message: `«${e.title}», ${formatDate(e.eventDate)} в ${e.eventTime}\n${e.address}\n\n` +
      `Придут: ${s.yes}\nНе смогут: ${s.no}\nНе ответили: ${s.pending}\nВсего приглашено: ${s.total}\n\nToyTime`,
  }).catch(() => {});
}

export default function Home() {
  const { events, event, error, loading, setCurrentId } = useCurrentEvent();
  const { config } = useSession();
  const s = event?.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  const demo = config?.testMode.whatsapp || config?.testMode.payments;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <TopHeader />
      <View style={styles.content}>
        <ErrorText>{error}</ErrorText>
        <SectionTitle right={events.length > 1 ? `${events.indexOf(event!) + 1} из ${events.length}` : demo ? 'Тестовый режим' : undefined}>Ваше мероприятие</SectionTitle>

        {event ? (
          <View style={styles.eventCard}>
            <View style={styles.eventTop}>
              <View style={{ flex: 1 }}>
                <T weight="extrabold" size={19} style={{ marginBottom: 6 }}>{event.title}</T>
                <View style={styles.meta}><Ionicons name="time-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted}>{formatDate(event.eventDate)} · {event.eventTime}</T></View>
                <View style={styles.meta}><Ionicons name="location-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted} style={{ flex: 1 }}>{event.address}</T></View>
              </View>
              <Pill {...eventStatus(event)} />
            </View>
            <View style={styles.countdown}>
              <Ionicons name="sparkles" size={13} color={colors.green} />
              <T weight="bold" size={12} color={colors.green}>{countdown(event)}</T>
            </View>
            <Stats items={[[s.yes, 'Придут'], [s.no, 'Отказались'], [s.pending, 'Ожидаем']]} />
            <Button title="Управлять гостями" icon="arrow-forward" variant="light" size="md" style={{ marginTop: 14 }} onPress={() => router.navigate('/guests')} />
          </View>
        ) : !loading ? (
          <View style={styles.eventCard}>
            <T weight="extrabold" size={19}>Пока нет мероприятия</T>
            <Muted style={{ marginTop: 6 }}>Создайте той, свадьбу или день рождения — и пригласите гостей за пару минут.</Muted>
          </View>
        ) : null}

        {events.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
            {events.map((e) => {
              const on = e.id === event?.id;
              return (
                <Pressable key={e.id} onPress={() => setCurrentId(e.id)} style={[styles.chip, on && styles.chipOn]}>
                  <T weight="bold" size={12} color={on ? '#fff' : colors.green} numberOfLines={1}>{e.title}</T>
                  <T size={11} color={on ? '#C6D8D0' : colors.muted}>{formatDate(e.eventDate)}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Button title="Создать мероприятие" icon="add" size="md" onPress={() => router.navigate({ pathname: '/event', params: { mode: 'new' } })} />

        <View style={{ height: 15 }} />
        <SectionTitle right="Сейчас">Быстрый обзор</SectionTitle>
        <Card>
          <Pressable style={styles.eventTop} onPress={() => router.navigate('/guests')} accessibilityRole="button">
            <View>
              <T weight="bold" size={15}>Ответы гостей</T>
              <Muted style={{ marginTop: 4 }}>Статусы обновляются при ответе</Muted>
            </View>
            <Ionicons name="arrow-up-outline" size={22} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
          </Pressable>
          <Stats items={[[s.yes, 'Придут'], [s.no, 'Не смогут'], [s.pending, 'Не ответили']]} />
          {s.total ? (
            <>
              <View style={{ marginTop: 14 }}><ResponseBar yes={s.yes} no={s.no} pending={s.pending} /></View>
              <View style={styles.summaryRow}>
                <Muted>Всего приглашено: {pluralGuests(s.total)}</Muted>
                {event ? (
                  <Pressable onPress={() => shareSummary(event)} style={styles.share} accessibilityRole="button">
                    <Ionicons name="share-outline" size={14} color={colors.green} />
                    <T weight="bold" size={12} color={colors.green}>Поделиться итогами</T>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </Card>

        <Notice>
          {demo
            ? 'Это тестовый режим. Сообщения и оплата пока не настоящие — гостям ничего не отправляется.'
            : 'Без рекламы. Гостям не нужно ничего устанавливать — они отвечают по ссылке.'}
        </Notice>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  eventCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.lime, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, marginTop: 12 },
  chip: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, maxWidth: 200 },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 },
  share: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
