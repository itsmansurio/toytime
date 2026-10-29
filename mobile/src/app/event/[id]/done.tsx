import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors, radius, themed } from '../../../lib/theme';
import { astanaDate, reminderSchedule } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { Button, Ionicons, T, TestBanner } from '../../../components/ui';
import { useTheme } from '../../../lib/themeContext';
import { t } from '../../../lib/i18n';

const CONFETTI = [
  { top: 20, left: 40, c: '#B8D65A', r: 20 }, { top: 60, left: 290, c: colors.green, r: -30 }, { top: 130, left: 20, c: '#E07A5F', r: 45 },
  { top: 10, left: 220, c: '#E07A5F', r: 10 }, { top: 150, left: 300, c: '#B8D65A', r: -15 }, { top: 90, left: 90, c: colors.greenMid, r: 60 },
];

export default function Done() {
  const { mode } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useRefresh(() => api.event(id), 30000);
  const { config } = useSession();
  const reminders = event ? reminderSchedule(event.eventDate, event.firstReminderDays).filter((r) => r.at > new Date()) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.hero}>
          {CONFETTI.map((c, i) => (
            <View key={i} style={[styles.confetti, { top: c.top, left: c.left, backgroundColor: c.c, transform: [{ rotate: `${c.r}deg` }] }]} />
          ))}
          <View style={styles.ring}><View style={styles.check}><Ionicons name="checkmark" size={46} color={colors.onPrimary} strokeWidth={3} /></View></View>
        </View>
        <T weight="extrabold" size={26} style={{ textAlign: 'center' }}>{t('Той создан!')}</T>
        <T size={15} color={colors.muted} style={{ textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
          {t('Приглашения уже отправляются гостям в WhatsApp. Напоминания придут в 9:00 по Астане тем, кто ответил «Приду», и тем, кто ещё не ответил.')}
        </T>
        {config?.testMode.whatsapp ? <TestBanner>{t('Тестовый режим: сообщения не уходят реальным гостям.')}</TestBanner> : null}
        {reminders.length ? (
          <View style={styles.box}>
            <T weight="bold" size={15} style={{ marginBottom: 6 }}>{t('Напоминания в 9:00 по Астане')}</T>
            {reminders.map((r) => (
              <View key={r.kind} style={styles.row}>
                <View style={styles.dot}><Ionicons name="notifications" size={13} color={colors.green} /></View>
                <T weight="medium" size={14} style={{ flex: 1 }}>{r.label}</T>
                <T weight="semibold" size={13} color={colors.muted}>{astanaDate(r.at)}</T>
              </View>
            ))}
          </View>
        ) : null}
        <Button title={t('На главную')} icon="home" onPress={() => router.replace('/')} style={{ marginTop: 16 }} />
        <Button title={t('Смотреть ответы гостей')} icon="people-outline" variant="light" onPress={() => router.replace('/guests')} style={{ marginTop: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  hero: { height: 190, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', width: 10, height: 18, borderRadius: 3 },
  ring: { padding: 12, borderRadius: 70, backgroundColor: colors.greenLight },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
}));
