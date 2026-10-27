import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors } from '../../../lib/theme';
import { formatDate, reminderSchedule, shortDate } from '../../../lib/format';
import { Button, Card, ErrorText, Stat } from '../../../components/ui';

function confirmDelete(): Promise<boolean> {
  const msg = 'Мероприятие, гости и их ответы будут удалены.';
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg));
  return new Promise((resolve) => Alert.alert('Удалить мероприятие?', msg, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e, error } = useRefresh(() => api.event(id), 8000);

  if (!e) return <View style={{ padding: 16 }}><ErrorText>{error}</ErrorText></View>;

  const stats = e.stats ?? { total: 0, yes: 0, no: 0, pending: 0 };
  const sentCount = (kind: string) => (e.messages ?? []).filter((m) => m.kind === kind && ['sent', 'delivered', 'read'].includes(m.status)).reduce((s, m) => s + m.n, 0);
  const reminders = reminderSchedule(e.startsAt, e.firstReminderDays);

  const remove = async () => {
    if (!(await confirmDelete())) return;
    await api.deleteEvent(id);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: e.title }} />
      <ErrorText>{error}</ErrorText>
      <Card>
        <Text style={styles.title}>{e.title}</Text>
        <Text style={styles.meta}>📅 {formatDate(e.eventDate)} · {e.eventTime}</Text>
        <Text style={styles.meta}>📍 {e.address}</Text>
        <Text style={styles.invite}>{e.invitationText}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Ответы гостей</Text>
        <View style={{ flexDirection: 'row' }}>
          <Stat value={stats.yes} label="Придут" color={colors.green} />
          <Stat value={stats.no} label="Не придут" color={colors.red} />
          <Stat value={stats.pending} label="Не ответили" color={colors.muted} />
        </View>
        <Text style={styles.total}>Всего приглашено: {stats.total}</Text>
      </Card>

      {e.invitesSentAt ? (
        <Card>
          <Text style={styles.section}>Рассылка</Text>
          <View style={styles.row}>
            <Text style={styles.rowText}>Приглашения</Text>
            <Text style={styles.rowStatus}>Отправлено: {sentCount('invite')} из {stats.total}</Text>
          </View>
          {reminders.map((r) => {
            const done = r.at <= new Date();
            return (
              <View key={r.kind} style={styles.row}>
                <Text style={styles.rowText}>{r.label} · {shortDate(r.at)}</Text>
                <Text style={styles.rowStatus}>{done ? `Отправлено: ${sentCount(r.kind)}` : 'Ожидается'}</Text>
              </View>
            );
          })}
          <Text style={styles.hint}>Напоминания получают только те, кто ещё не ответил.</Text>
        </Card>
      ) : null}

      <Button title={`Гости (${stats.total})`} variant="outline" onPress={() => router.push(`/event/${id}/guests`)} />
      <View style={{ height: 10 }} />
      {e.paymentStatus !== 'paid' ? (
        <Button title="Оплатить и отправить приглашения" onPress={() => router.push(`/event/${id}/pay`)} disabled={!stats.total} />
      ) : !e.invitesSentAt ? (
        <Button title="Отправить приглашения" onPress={() => router.push(`/event/${id}/pay`)} disabled={!stats.total} />
      ) : null}
      <Button title="Удалить мероприятие" variant="ghost" onPress={remove} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  meta: { fontSize: 15, color: colors.muted, marginTop: 3 },
  invite: { fontSize: 15, color: colors.text, marginTop: 12, lineHeight: 21 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  total: { textAlign: 'center', color: colors.muted, marginTop: 6, fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, gap: 8 },
  rowText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  rowStatus: { fontSize: 13, color: colors.green, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
});
