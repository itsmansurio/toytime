import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors, radius, shadow } from '../../../lib/theme';
import { formatDate, reminderSchedule, shortDate } from '../../../lib/format';
import { Button, Card, ErrorText, Ionicons, ResponseBar, SectionTitle, T, type IconName } from '../../../components/ui';
import { StatTiles } from '../../../components/Stats';

function confirmDelete(): Promise<boolean> {
  const msg = 'Мероприятие, гости и их ответы будут удалены.';
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg));
  return new Promise((resolve) => Alert.alert('Удалить мероприятие?', msg, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

function TimelineItem({ icon, title, sub, status, done, last }: { icon: IconName; title: string; sub: string; status: string; done: boolean; last?: boolean }) {
  return (
    <View style={styles.tlRow}>
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.tlDot, done && styles.tlDotDone]}>
          <Ionicons name={done ? 'checkmark' : icon} size={14} color={done ? '#fff' : colors.green} />
        </View>
        {!last ? <View style={styles.tlLine} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
        <T weight="bold" size={14}>{title}</T>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <T size={13} color={colors.muted}>{sub}</T>
          <T size={13} color={colors.muted}>·</T>
          <T size={13} weight="semibold" color={done ? colors.green : colors.amber}>{status}</T>
        </View>
      </View>
    </View>
  );
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e, error } = useRefresh(() => api.event(id), 8000);
  const insets = useSafeAreaInsets();

  if (!e) return <View style={{ padding: 16, paddingTop: insets.top + 60 }}><ErrorText>{error}</ErrorText></View>;

  const stats = e.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  const sentCount = (kind: string) => (e.messages ?? []).filter((m) => m.kind === kind && ['sent', 'delivered', 'read'].includes(m.status)).reduce((s, m) => s + m.n, 0);
  const reminders = reminderSchedule(e.startsAt, e.firstReminderDays);
  const daysLeft = Math.ceil((new Date(e.startsAt).getTime() - Date.now()) / 86400000);

  const remove = async () => {
    if (!(await confirmDelete())) return;
    await api.deleteEvent(id);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#13704A', colors.green, colors.greenDark]} style={[styles.hero, { paddingTop: insets.top + 56 }]}>
        <View style={styles.heroGlow} />
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={13} color={colors.gold} />
          <T weight="bold" size={12} color={colors.goldLight}>{daysLeft > 0 ? `Через ${daysLeft} дн.` : 'Сегодня'}</T>
        </View>
        <T weight="extrabold" size={26} color="#fff" style={{ marginTop: 10 }}>{e.title}</T>
        <View style={styles.heroMeta}><Ionicons name="calendar-outline" size={16} color="#CFE6D8" /><T weight="medium" size={14} color="#E3F0E8">{formatDate(e.eventDate)}, {e.eventTime}</T></View>
        <Pressable style={styles.heroMeta} onPress={() => Linking.openURL(`https://2gis.kz/search/${encodeURIComponent(e.address)}`)}>
          <Ionicons name="location-outline" size={16} color="#CFE6D8" />
          <T weight="medium" size={14} color="#E3F0E8" style={{ flex: 1, textDecorationLine: 'underline' }}>{e.address}</T>
        </Pressable>
      </LinearGradient>

      <View style={styles.body}>
        <Card style={{ marginTop: -28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <T weight="bold" size={16}>Ответы гостей</T>
            <T weight="semibold" size={13} color={colors.muted}>Всего {stats.total}</T>
          </View>
          <StatTiles yes={stats.yes} no={stats.no} pending={stats.pending} />
          <View style={{ marginTop: 14 }}><ResponseBar yes={stats.yes} no={stats.no} pending={stats.pending} height={10} /></View>
        </Card>

        <View style={styles.actions}>
          <Button style={{ flex: 1 }} size="md" variant="outline" icon="people-outline" title={`Гости · ${stats.total}`} onPress={() => router.push(`/event/${id}/guests`)} />
          {e.paymentStatus !== 'paid' || !e.invitesSentAt ? (
            <Button style={{ flex: 1.3 }} size="md" icon="paper-plane-outline" title={e.paymentStatus !== 'paid' ? 'Оплатить и отправить' : 'Отправить'}
              onPress={() => router.push(`/event/${id}/pay`)} disabled={!stats.total} />
          ) : null}
        </View>

        {e.invitesSentAt ? (
          <>
            <SectionTitle>Рассылка в WhatsApp</SectionTitle>
            <Card>
              <TimelineItem icon="paper-plane-outline" title="Приглашения" sub={shortDate(new Date(e.invitesSentAt))} status={`Отправлено ${sentCount('invite')} из ${stats.total}`} done />
              {reminders.map((r, i) => {
                const done = r.at <= new Date();
                return (
                  <TimelineItem key={r.kind} icon="notifications-outline" title={`Напоминание: ${r.label.toLowerCase()}`} sub={shortDate(r.at)}
                    status={done ? `Отправлено ${sentCount(r.kind)}` : 'Ожидается'} done={done} last={i === reminders.length - 1} />
                );
              })}
              <View style={styles.note}>
                <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
                <T size={12} color={colors.muted} style={{ flex: 1 }}>Напоминания получают только те, кто ещё не ответил.</T>
              </View>
            </Card>
          </>
        ) : null}

        <SectionTitle>Текст приглашения</SectionTitle>
        <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.gold }}>
          <T size={15} color={colors.textSoft}>{e.invitationText}</T>
        </Card>

        <Button title="Удалить мероприятие" icon="trash-outline" variant="ghost" onPress={remove} style={{ marginTop: 4 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 48, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#fff', opacity: 0.06, top: -80, right: -60 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(201,162,75,0.22)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  body: { paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.greenLight, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.greenLight, marginVertical: 2 },
  note: { flexDirection: 'row', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
