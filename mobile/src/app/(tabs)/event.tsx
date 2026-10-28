import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/api';
import { useCurrentEvent } from '../../lib/current';
import { colors, radius } from '../../lib/theme';
import { toIsoDate, toTime } from '../../lib/format';
import { Button, Card, ErrorText, Field, HeaderRow, Ionicons, Label, Notice, SectionTitle, T } from '../../components/ui';
import { DateTimeFields } from '../../components/DateTimeFields';
import { TopHeader } from '../../components/TopHeader';
import { useToast } from '../../components/Toast';

const DEFAULT_TEXT = 'Будем рады разделить с вами наш особенный день!';
const PRESETS = ['Свадебный той', 'Сүндет той', 'Тұсау кесер', 'Қыз ұзату', 'День рождения', 'Юбилей'];

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(18, 0, 0, 0);
  return d;
}

// «Детали мероприятия» — шаг 1 из 3. Создаёт новое или редактирует текущее.
export default function EventForm() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { event, loading: eventsLoading, setCurrentId, reload } = useCurrentEvent(60000);
  const editing = mode !== 'new' && event ? event : null;
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [address, setAddress] = useState('');
  const [host, setHost] = useState('');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [firstReminder, setFirstReminder] = useState<7 | 10>(10);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Заполняем форму данными текущего мероприятия или очищаем для нового.
  const key = editing ? editing.id : 'new';
  useEffect(() => {
    if (editing) {
      const [y, m, d] = editing.eventDate.split('-').map(Number);
      const [hh, mm] = editing.eventTime.split(':').map(Number);
      setTitle(editing.title); setDate(new Date(y, m - 1, d, hh, mm)); setAddress(editing.address);
      setHost(editing.hostName ?? ''); setText(editing.invitationText); setFirstReminder(editing.firstReminderDays);
    } else {
      setTitle(''); setDate(defaultDate()); setAddress(''); setHost(''); setText(DEFAULT_TEXT); setFirstReminder(10);
    }
    setError(null);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!title.trim()) { setError('Введите название тоя'); return; }
    if (!address.trim()) { setError('Укажите ресторан или адрес'); return; }
    setSaving(true);
    setError(null);
    const data = {
      title: title.trim(), event_date: toIsoDate(date), event_time: toTime(date), address: address.trim(),
      host_name: host.trim() || null, invitation_text: text.trim() || DEFAULT_TEXT, first_reminder_days: firstReminder,
    };
    try {
      const saved = editing ? await api.updateEvent(editing.id, data) : await api.createEvent(data);
      setCurrentId(saved.id);
      await reload();
      toast('Мероприятие сохранено');
      router.setParams({ mode: undefined });
      router.navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <TopHeader />
        <View style={{ padding: 16 }}>
          <HeaderRow onBack={() => router.navigate('/')} right="Шаг 1 из 3" />
          <SectionTitle right={editing ? 'Редактирование' : eventsLoading ? undefined : 'Новое'}>Детали мероприятия</SectionTitle>
          <Card>
            <Field label="Название тоя" placeholder="Например, Тұсау кесер Айсулу" value={title} onChangeText={setTitle} maxLength={50} />
            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <Pressable key={p} onPress={() => setTitle(p)} style={[styles.chip, title === p && styles.chipOn]}>
                  <T weight="semibold" size={12} color={title === p ? '#fff' : colors.green}>{p}</T>
                </Pressable>
              ))}
            </View>
            <View style={styles.grid2}>
              <View style={{ flex: 1 }}><Label>Дата</Label></View>
              <View style={{ flex: 1 }}><Label>Время</Label></View>
            </View>
            <DateTimeFields value={date} onChange={setDate} />
            <View style={{ height: 13 }} />
            <Field label="Ресторан / адрес" placeholder="Название ресторана, адрес" value={address} onChangeText={setAddress} maxLength={200} />
            <Field label="Имя хозяина / организатора" placeholder="Как подписать приглашение" value={host} onChangeText={setHost} maxLength={80} />
            <Field label="Текст приглашения (можно изменить)" placeholder="Будем рады видеть вас..." value={text} onChangeText={setText} multiline maxLength={1000} />
            <Label>Первое напоминание тем, кто не ответил</Label>
            <View style={styles.segment}>
              {([10, 7] as const).map((d) => {
                const on = firstReminder === d;
                return (
                  <Pressable key={d} style={[styles.segItem, on && styles.segOn]} onPress={() => setFirstReminder(d)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                    <Ionicons name="notifications-outline" size={14} color={on ? '#fff' : colors.textSoft} />
                    <T weight="bold" size={13} color={on ? '#fff' : colors.textSoft}>За {d} дней</T>
                  </Pressable>
                );
              })}
            </View>
            <T size={11} color={colors.muted} style={{ marginTop: 6, marginBottom: 14 }}>Затем за 3 дня и в день тоя.</T>
            <ErrorText>{error}</ErrorText>
            <Button title="Сохранить мероприятие" size="md" onPress={save} loading={saving} />
          </Card>
          <Notice>Совет: сначала сохраните мероприятие, затем добавьте гостей и проверьте приглашение.</Notice>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.greenSoft },
  chipOn: { backgroundColor: colors.green },
  grid2: { flexDirection: 'row', gap: 10 },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.sm, padding: 3, gap: 3 },
  segItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  segOn: { backgroundColor: colors.green },
});
