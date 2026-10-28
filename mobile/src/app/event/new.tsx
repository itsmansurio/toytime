import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { colors, radius } from '../../lib/theme';
import { toIsoDate, toTime } from '../../lib/format';
import { Button, ErrorText, Field, Ionicons, Label, T } from '../../components/ui';
import { DateTimeFields } from '../../components/DateTimeFields';

const DEFAULT_TEXT = 'Будем рады видеть вас на нашем празднике! До встречи!';
const PRESETS = ['Свадебный той', 'Сүндет той', 'Тусау кесер', 'Қыз ұзату', 'День рождения', 'Юбилей'];

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(19, 0, 0, 0);
  return d;
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <View style={styles.step}>
      <T weight="extrabold" size={17} style={{ letterSpacing: -0.3 }}>{title}</T>
      <View style={styles.stepNum}><T weight="bold" size={11} color={colors.green}>Шаг {n} из 3</T></View>
    </View>
  );
}

export default function NewEvent() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [address, setAddress] = useState('');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [firstReminder, setFirstReminder] = useState<7 | 10>(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = title.trim() && address.trim() && text.trim();

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const event = await api.createEvent({
        title: title.trim(), event_date: toIsoDate(date), event_time: toTime(date),
        address: address.trim(), invitation_text: text.trim(), first_reminder_days: firstReminder,
      });
      router.replace({ pathname: '/event/[id]/guests', params: { id: event.id, flow: '1' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Step n={1} title="Что празднуем" />
          <Field placeholder="Например, Свадебный той" value={title} onChangeText={setTitle} maxLength={50} counter icon="sparkles-outline" />
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable key={p} onPress={() => setTitle(p)} style={[styles.chip, title === p && styles.chipOn]}>
                <T weight="semibold" size={13} color={title === p ? '#fff' : colors.green}>{p}</T>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Step n={2} title="Когда и где" />
          <DateTimeFields value={date} onChange={setDate} />
          <View style={{ height: 12 }} />
          <Field placeholder="Ресторан «Астана», ул. Назарбаева, 10" value={address} onChangeText={setAddress} maxLength={200} icon="location-outline" />
        </View>

        <View style={styles.card}>
          <Step n={3} title="Приглашение" />
          <Field value={text} onChangeText={setText} multiline maxLength={1000} counter icon="chatbubble-ellipses-outline" />
          <Label>Первое напоминание тем, кто не ответил</Label>
          <View style={styles.segment}>
            {([10, 7] as const).map((d) => {
              const on = firstReminder === d;
              return (
                <Pressable key={d} style={[styles.segItem, on && styles.segOn]} onPress={() => setFirstReminder(d)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <Ionicons name="notifications-outline" size={16} color={on ? '#fff' : colors.textSoft} />
                  <T weight="bold" size={14} color={on ? '#fff' : colors.textSoft}>За {d} дней</T>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <T size={12} color={colors.muted} style={{ flex: 1 }}>Затем за 3 дня и в день тоя. Ответившим гостям напоминания не приходят.</T>
          </View>
        </View>

        <ErrorText>{error}</ErrorText>
        <Button title="Далее: гости" icon="arrow-forward" onPress={submit} disabled={!canSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, paddingBottom: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  step: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  stepNum: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.lime },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.greenSoft },
  chipOn: { backgroundColor: colors.green },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, gap: 4 },
  segItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 11 },
  segOn: { backgroundColor: colors.green },
  hint: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 12 },
});
