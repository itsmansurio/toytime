import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';
import { toIsoDate, toTime } from '../../lib/format';
import { Button, ErrorText, Field, Label } from '../../components/ui';
import { DateTimeFields } from '../../components/DateTimeFields';

const DEFAULT_TEXT = 'Будем рады видеть вас на нашем празднике! До встречи!';

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(19, 0, 0, 0);
  return d;
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
        <Field label="Название мероприятия" placeholder="Свадебный той" value={title} onChangeText={setTitle} maxLength={50} counter />
        <Label>Дата и время</Label>
        <DateTimeFields value={date} onChange={setDate} />
        <View style={{ height: 16 }} />
        <Field label="Место проведения" placeholder="Ресторан «Астана», ул. Нурсултана Назарбаева, 10" value={address} onChangeText={setAddress} maxLength={200} />
        <Field label="Текст приглашения" value={text} onChangeText={setText} multiline maxLength={1000} counter />
        <Label>Первое напоминание тем, кто не ответил</Label>
        <View style={styles.options}>
          {([10, 7] as const).map((d) => (
            <Pressable key={d} style={styles.option} onPress={() => setFirstReminder(d)} accessibilityRole="radio" accessibilityState={{ checked: firstReminder === d }}>
              <View style={[styles.radio, firstReminder === d && styles.radioOn]} />
              <Text style={styles.optionText}>За {d} дней</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Потом ещё за 3 дня и в день мероприятия. Ответившим напоминания не приходят.</Text>
        <ErrorText>{error}</ErrorText>
        <Button title="Далее" onPress={submit} disabled={!canSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  options: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.green, borderWidth: 7 },
  optionText: { fontSize: 16, color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 18 },
});
