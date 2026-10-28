import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { api } from '../../../lib/api';
import { formatPhone, normalizePhone } from '../../../lib/phone';
import { colors, font, radius, themed } from '../../../lib/theme';
import { Avatar, Button, EmptyState, ErrorText, Ionicons, T } from '../../../components/ui';
import { useTheme } from '../../../lib/themeContext';

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
  const { mode } = useTheme();
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
    const denied = stage === 'denied';
    return (
      <View style={styles.ask}>
        <EmptyState
          icon={denied ? 'lock-closed-outline' : 'people-outline'}
          title={denied ? 'Нет доступа к контактам' : 'Разрешите доступ к контактам'}
          text={denied
            ? Platform.OS === 'web'
              ? 'В браузере контакты недоступны. Добавьте гостей вручную.'
              : 'Доступ можно включить в настройках телефона. А пока добавьте гостей вручную.'
            : 'Так вы быстро выберете гостей. Контакты читаются только на телефоне — на сервер уходят лишь отмеченные вами люди.'}
        />
        <View style={{ alignSelf: 'stretch', marginTop: 28 }}>
          <ErrorText>{error}</ErrorText>
          {!denied ? <Button title="Разрешить" icon="checkmark" onPress={allow} /> : null}
          <Button title={denied ? 'Добавить вручную' : 'Позже'} variant={denied ? 'primary' : 'outline'} style={{ marginTop: 10 }}
            onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (stage === 'loading') return <ActivityIndicator style={{ marginTop: 60 }} color={colors.green} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingTop: 4, paddingBottom: 8 }}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Поиск контактов…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} />
        </View>
        <View style={styles.selRow}>
          <T weight="bold" size={14}>Выбрано: {selected.size}</T>
          {selected.size ? <Pressable onPress={() => setSelected(new Set())}><T weight="semibold" size={14} color={colors.green}>Очистить</T></Pressable> : null}
        </View>
      </View>
      <FlatList
      extraData={mode}
        data={filtered}
        keyExtractor={(c) => c.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        initialNumToRender={30}
        renderItem={({ item }) => {
          const on = selected.has(item.key);
          return (
            <Pressable style={[styles.item, on && styles.itemOn]} onPress={() => toggle(item.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Avatar name={item.name} />
              <View style={{ flex: 1 }}>
                <T weight="bold" size={15}>{item.name}</T>
                <T size={13} color={colors.muted}>{formatPhone(item.phone)}</T>
              </View>
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
            </Pressable>
          );
        }}
      />
      <View style={styles.bottom}>
        <ErrorText>{error}</ErrorText>
        <Button title={`Выбрать (${selected.size})`} icon="checkmark" onPress={save} disabled={!selected.size} loading={saving} />
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  ask: { flex: 1, alignItems: 'center', padding: 24 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: font.medium, color: colors.text, outlineStyle: 'none' } as object,
  selRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 12, borderRadius: radius.md, marginBottom: 6, borderWidth: 1.5, borderColor: 'transparent' },
  itemOn: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 24 },
}));
