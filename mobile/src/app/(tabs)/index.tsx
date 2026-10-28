import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { EventItem } from '../../lib/api';
import { eventStatus } from '../../lib/status';
import { useCurrentEvent } from '../../lib/current';
import { useSession } from '../../lib/session';
import { useTheme } from '../../lib/themeContext';
import { colors, radius, shadow, themed } from '../../lib/theme';
import { formatDate, pluralGuests } from '../../lib/format';
import {
  Button, Card, EmptyState, ErrorText, FadeIn, Ionicons, Muted, Notice, Pill, PressScale, ResponseBar, SectionTitle, Skeleton,
  SkeletonCard, Stats, T, type IconName,
} from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';

function daysLeft(e: EventItem) {
  return Math.ceil((new Date(e.startsAt).getTime() - Date.now()) / 86400000);
}

function daysWord(d: number) {
  const m10 = d % 10, m100 = d % 100;
  return m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
}

// Итоги для ресторана и родных: кто придёт, кто нет, кто молчит.
async function shareSummary(e: EventItem) {
  const s = e.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  await Share.share({
    message: `«${e.title}», ${formatDate(e.eventDate)} в ${e.eventTime}\n${e.address}\n\n` +
      `Придут: ${s.yes}\nНе смогут: ${s.no}\nНе ответили: ${s.pending}\nВсего приглашено: ${s.total}\n\nToiTime`,
  }).catch(() => {});
}

// Плитка Bento-сетки.
function Tile({ icon, label, value, sub, onPress, tone = 'card', delay }: {
  icon: IconName; label: string; value: string; sub?: string; onPress?: () => void; tone?: 'card' | 'lime' | 'dark'; delay?: number;
}) {
  const fg = tone === 'lime' ? colors.onLime : tone === 'dark' ? '#FFFFFF' : colors.text;
  const sfg = tone === 'lime' ? colors.onLime : tone === 'dark' ? colors.headerSub : colors.muted;
  return (
    <FadeIn delay={delay} style={{ flex: 1 }}>
      <PressScale onPress={onPress} disabled={!onPress} style={[styles.tile, tone === 'lime' && styles.tileLime, tone === 'dark' && styles.tileDark]} accessibilityLabel={label}>
        <View style={styles.tileTop}>
          <View style={[styles.tileIcon, tone !== 'card' && { backgroundColor: tone === 'lime' ? '#123C3214' : '#FFFFFF1A' }]}>
            <Ionicons name={icon} size={16} color={tone === 'card' ? colors.green : fg} />
          </View>
          {onPress ? <Ionicons name="arrow-up-right" size={16} color={sfg} /> : null}
        </View>
        <T weight="semibold" size={12} color={sfg} style={{ marginTop: 14 }}>{label}</T>
        <T weight="extrabold" size={22} color={fg} style={{ letterSpacing: -0.6 }} numberOfLines={1}>{value}</T>
        {sub ? <T size={11} color={sfg} numberOfLines={1}>{sub}</T> : null}
      </PressScale>
    </FadeIn>
  );
}

export default function Home() {
  useTheme();
  const { events, event, error, loading, setCurrentId } = useCurrentEvent();
  const { config } = useSession();
  const s = event?.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  const demo = config?.testMode.whatsapp || config?.testMode.payments;
  const d = event ? daysLeft(event) : 0;
  const newEvent = () => router.navigate({ pathname: '/event', params: { mode: 'new' } });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <TopHeader />
      <View style={styles.content}>
        <ErrorText>{error}</ErrorText>
        <SectionTitle right={events.length > 1 ? `${events.indexOf(event!) + 1} из ${events.length}` : demo ? 'Тестовый режим' : undefined}>Ваше мероприятие</SectionTitle>

        {loading && !event ? (
          <>
            <SkeletonCard tall />
            <View style={styles.bento}><Skeleton width="48%" height={112} radius={20} /><Skeleton width="48%" height={112} radius={20} /></View>
          </>
        ) : event ? (
          <>
            <Card style={styles.eventCard}>
              <View style={styles.eventTop}>
                <View style={{ flex: 1 }}>
                  <T weight="extrabold" size={20} style={{ marginBottom: 6, letterSpacing: -0.4 }}>{event.title}</T>
                  <View style={styles.meta}><Ionicons name="time-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted}>{formatDate(event.eventDate)} · {event.eventTime}</T></View>
                  <View style={styles.meta}><Ionicons name="location-outline" size={14} color={colors.muted} /><T size={13} color={colors.muted} style={{ flex: 1 }}>{event.address}</T></View>
                </View>
                <Pill {...eventStatus(event)} />
              </View>
              <Stats items={[[s.yes, 'Придут'], [s.no, 'Отказались'], [s.pending, 'Ожидаем']]} />
              <Button title="Управлять гостями" icon="arrow-forward" variant="light" size="md" style={{ marginTop: 14 }} onPress={() => router.navigate('/guests')} />
            </Card>

            <View style={styles.bento}>
              <Tile tone="lime" icon="sparkles" label="До тоя" value={d < 0 ? 'Прошёл' : d === 0 ? 'Сегодня!' : `${d} ${daysWord(d)}`} sub={formatDate(event.eventDate)} delay={40} />
              <Tile tone="dark" icon="send" label="Приглашения" value={event.invitesSentAt ? 'Отправлены' : 'Не отправлены'}
                sub={event.invitesSentAt ? 'Ответившим не напоминаем' : 'Проверьте и отправьте'} onPress={() => router.navigate('/send')} delay={80} />
            </View>
            <View style={styles.bento}>
              <Tile icon="wallet" label="Оплата" value={event.paymentStatus === 'paid' ? 'Оплачено' : '1 000 ₸'}
                sub={event.paymentStatus === 'paid' ? 'Без рекламы' : 'Один раз за той'} onPress={() => router.navigate('/payment')} delay={120} />
              <Tile icon="share-outline" label="Итоги" value={`${s.yes} из ${s.total}`} sub="Поделиться с рестораном" onPress={s.total ? () => shareSummary(event) : undefined} delay={160} />
            </View>
          </>
        ) : (
          <Card>
            <EmptyState compact icon="calendar-outline" title="Пока нет мероприятия"
              text="Создайте той, свадьбу или день рождения — и пригласите гостей за пару минут." action="Создать мероприятие" onAction={newEvent} />
          </Card>
        )}

        {events.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
            {events.map((e) => {
              const on = e.id === event?.id;
              return (
                <Pressable key={e.id} onPress={() => setCurrentId(e.id)} style={[styles.chip, on && styles.chipOn]}>
                  <T weight="bold" size={12} color={on ? colors.onPrimary : colors.green} numberOfLines={1}>{e.title}</T>
                  <T size={11} color={on ? colors.onPrimary : colors.muted}>{formatDate(e.eventDate)}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {event ? <Button title="Создать мероприятие" icon="add" size="md" onPress={newEvent} /> : null}

        {event ? (
          <>
            <View style={{ height: 15 }} />
            <SectionTitle right="Сейчас">Быстрый обзор</SectionTitle>
            <Card>
              <Pressable style={styles.eventTop} onPress={() => router.navigate('/guests')} accessibilityRole="button">
                <View>
                  <T weight="bold" size={15}>Ответы гостей</T>
                  <Muted style={{ marginTop: 4 }}>Статусы обновляются при ответе</Muted>
                </View>
                <Ionicons name="arrow-up-right" size={22} color={colors.text} />
              </Pressable>
              <Stats items={[[s.yes, 'Придут'], [s.no, 'Не смогут'], [s.pending, 'Не ответили']]} />
              {s.total ? (
                <>
                  <View style={{ marginTop: 14 }}><ResponseBar yes={s.yes} no={s.no} pending={s.pending} /></View>
                  <Muted style={{ marginTop: 10 }}>Всего приглашено: {pluralGuests(s.total)}</Muted>
                </>
              ) : (
                <EmptyState compact icon="user-plus" title="Гостей пока нет" text="Добавьте гостей — здесь появятся их ответы."
                  action="Добавить гостей" onAction={() => router.navigate('/guests')} />
              )}
            </Card>
          </>
        ) : null}

        <Notice>
          {demo
            ? 'Это тестовый режим. Сообщения и оплата пока не настоящие — гостям ничего не отправляется.'
            : 'Без рекламы. Гостям не нужно ничего устанавливать — они отвечают по ссылке.'}
        </Notice>
      </View>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  content: { padding: 16 },
  eventCard: { borderRadius: radius.xl, padding: 18 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  bento: { flexDirection: 'row', gap: 12, marginBottom: 12, justifyContent: 'space-between' },
  tile: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, minHeight: 128, borderWidth: 1, borderColor: colors.border, ...shadow },
  tileLime: { backgroundColor: colors.lime, borderColor: colors.lime },
  tileDark: { backgroundColor: colors.header, borderColor: colors.header },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxWidth: 200 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
}));
