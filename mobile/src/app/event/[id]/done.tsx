import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors, radius } from '../../../lib/theme';
import { reminderSchedule, shortDate } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { Button, Ionicons, T, TestBanner } from '../../../components/ui';

const CONFETTI = [
  { top: 20, left: 40, c: colors.gold, r: 20 }, { top: 60, left: 290, c: colors.green, r: -30 }, { top: 130, left: 20, c: '#E07A5F', r: 45 },
  { top: 10, left: 220, c: '#E07A5F', r: 10 }, { top: 150, left: 300, c: colors.gold, r: -15 }, { top: 90, left: 90, c: colors.greenMid, r: 60 },
];

export default function Done() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useRefresh(() => api.event(id), 30000);
  const { config } = useSession();
  const reminders = event ? reminderSchedule(event.startsAt, event.firstReminderDays).filter((r) => r.at > new Date()) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.hero}>
          {CONFETTI.map((c, i) => (
            <View key={i} style={[styles.confetti, { top: c.top, left: c.left, backgroundColor: c.c, transform: [{ rotate: `${c.r}deg` }] }]} />
          ))}
          <View style={styles.ring}><View style={styles.check}><Ionicons name="checkmark" size={46} color="#fff" /></View></View>
        </View>
        <T weight="extrabold" size={26} style={{ textAlign: 'center' }}>Той создан!</T>
        <T size={15} color={colors.muted} style={{ textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
          Приглашения уже отправляются гостям в WhatsApp. Тем, кто не ответит, мы напомним сами.
        </T>
        {config?.testMode.whatsapp ? <TestBanner>Тестовый режим: сообщения не уходят реальным гостям.</TestBanner> : null}
        {reminders.length ? (
          <View style={styles.box}>
            <T weight="bold" size={15} style={{ marginBottom: 6 }}>Напоминания тем, кто не ответил</T>
            {reminders.map((r) => (
              <View key={r.kind} style={styles.row}>
                <View style={styles.dot}><Ionicons name="notifications" size={13} color={colors.green} /></View>
                <T weight="medium" size={14} style={{ flex: 1 }}>{r.label}</T>
                <T weight="semibold" size={13} color={colors.muted}>{shortDate(r.at)}</T>
              </View>
            ))}
          </View>
        ) : null}
        <Button title="Готово" icon="checkmark" onPress={() => router.replace(`/event/${id}`)} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 190, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', width: 10, height: 18, borderRadius: 3 },
  ring: { padding: 12, borderRadius: 70, backgroundColor: colors.greenLight },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
});
