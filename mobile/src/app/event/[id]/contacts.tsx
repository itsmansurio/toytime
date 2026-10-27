import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { api } from '../../../lib/api';
import { formatPhone, normalizePhone } from '../../../lib/phone';
import { colors } from '../../../lib/theme';
import { Button, ErrorText } from '../../../components/ui';

interface Candidate { key: string; name: string; phone: string }

// Читаем только имя и телефоны и только на устройстве.
// На сервер уходят лишь отмеченные контакты.
async function loadContacts(): Promise<Candidate[]> {
  const details = await Contact.getAllDetails([ContactField.FULL_NAME, ContactField.PHONES] as const);
  const seen = new Set<string>();
  const result: Candidate[] = [];
  for (const c of details) {
    for (const p of c.phones ?? []) {
      const phone = p.number ? normalizePhone(p.number) : null;
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      result.push({ key: phone, name: c.fullName || phone, phone });
      break;
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export default function ContactsPicker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stage, setStage] = useState<'ask' | 'loading' | 'list' | 'denied'>('ask');
  const [contacts, setContacts] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allow = async () => {
    setError(null);
    if (Platform.OS === 'web') { setStage('denied'); return; }
    const { status } = await requestPermissionsAsync();
    if (status !== 'granted') { setStage('denied'); return; }
    setStage('loading');
    try {
      const [all, existing] = await Promise.all([loadContacts(), api.guests(id)]);
      const already = new Set(existing.map((g) => g.phone));
      setContacts(all.filter((c) => !already.has(c.phone)));
      setStage('list');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось прочитать контакты');
      setStage('ask');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    const digits = q.replace(/\D/g, '');
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || (digits && c.phone.includes(digits)));
  }, [contacts, query]);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const guests = contacts.filter((c) => selected.has(c.key)).map(({ name, phone }) => ({ name, phone }));
      await api.addGuests(id, guests);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setSaving(false);
    }
  };

  if (stage === 'ask' || stage === 'denied') {
    return (
      <View style={styles.ask}>
        <Text style={styles.askIcon}>📇</Text>
        <Text style={styles.askTitle}>{stage === 'denied' ? 'Нет доступа к контактам' : 'Разрешите доступ к контактам'}</Text>
        <Text style={styles.askText}>
          {stage === 'denied'
            ? Platform.OS === 'web'
              ? 'В браузере контакты недоступны. Добавьте гостей вручную.'
              : 'Доступ можно включить в настройках телефона. А пока добавьте гостей вручную.'
            : 'Контакты нужны, чтобы быстро выбрать гостей. Они читаются только на телефоне, на сервер уходят лишь выбранные вами гости.'}
        </Text>
        <ErrorText>{error}</ErrorText>
        {stage === 'ask' ? <Button title="Разрешить" onPress={allow} style={{ alignSelf: 'stretch' }} /> : null}
        <Button title={stage === 'ask' ? 'Позже' : 'Добавить вручную'} variant="outline" style={{ alignSelf: 'stretch', marginTop: 10 }}
          onPress={() => router.replace(`/event/${id}/manual`)} />
      </View>
    );
  }

  if (stage === 'loading') return <ActivityIndicator style={{ marginTop: 60 }} color={colors.green} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <TextInput style={styles.search} placeholder="Поиск контактов…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} />
        <View style={styles.selRow}>
          <Text style={styles.selText}>Выбрано: {selected.size}</Text>
          {selected.size ? <Pressable onPress={() => setSelected(new Set())}><Text style={styles.clear}>Очистить</Text></Pressable> : null}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        initialNumToRender={30}
        renderItem={({ item }) => {
          const on = selected.has(item.key);
          return (
            <Pressable style={styles.item} onPress={() => toggle(item.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>{formatPhone(item.phone)}</Text>
              </View>
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text> : null}</View>
            </Pressable>
          );
        }}
      />
      <View style={styles.bottom}>
        <ErrorText>{error}</ErrorText>
        <Button title={`Выбрать (${selected.size})`} onPress={save} disabled={!selected.size} loading={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ask: { flex: 1, alignItems: 'center', padding: 28, paddingTop: 60 },
  askIcon: { fontSize: 64 },
  askTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 16, color: colors.text },
  askText: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 10, marginBottom: 28, lineHeight: 21 },
  search: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  selRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  selText: { fontWeight: '600', color: colors.text },
  clear: { color: colors.green, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  phone: { fontSize: 13, color: colors.muted, marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.green, borderColor: colors.green },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 24 },
});
