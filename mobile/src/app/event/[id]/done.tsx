import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors } from '../../../lib/theme';
import { reminderSchedule, shortDate } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { Button, Card, TestBanner } from '../../../components/ui';

export default function Done() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useRefresh(() => api.event(id), 30000);
  const { config } = useSession();
  const reminders = event ? reminderSchedule(event.startsAt, event.firstReminderDays).filter((r) => r.at > new Date()) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'stretch' }}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>Приглашения отправляются!</Text>
        <Text style={styles.text}>
          Мероприятие сохранено. Гости получат приглашение в WhatsApp, а тем, кто не ответит, мы напомним автоматически.
        </Text>
        {config?.testMode.whatsapp ? (
          <TestBanner>Тестовый режим: сообщения не уходят реальным гостям, их можно посмотреть в журнале эмулятора на сервере.</TestBanner>
        ) : null}
        {reminders.length ? (
          <Card style={{ backgroundColor: colors.greenLight }}>
            <Text style={styles.cardTitle}>Напоминания тем, кто не ответил:</Text>
            {reminders.map((r) => (
              <View key={r.kind} style={styles.row}>
                <Text style={styles.rowText}>🔔 {r.label}</Text>
                <Text style={styles.rowDate}>{shortDate(r.at)}</Text>
              </View>
            ))}
          </Card>
        ) : null}
        <Button title="Готово" onPress={() => router.replace(`/event/${id}`)} style={{ marginTop: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 72, textAlign: 'center', marginTop: 40 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.text, marginTop: 16 },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center', marginVertical: 16, lineHeight: 21 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowText: { fontSize: 15, color: colors.text },
  rowDate: { fontSize: 14, color: colors.muted },
});
