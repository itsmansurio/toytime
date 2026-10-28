import { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, type Guest, type Rsvp } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors, font, radius } from '../../../lib/theme';
import { formatPhone } from '../../../lib/phone';
import { Avatar, Button, EmptyState, ErrorText, Ionicons, Pill, T, type IconName } from '../../../components/ui';

const RSVP: Record<Rsvp, { label: string; color: string; bg: string; icon: IconName }> = {
  yes: { label: 'Придёт', color: colors.yes, bg: colors.yesLight, icon: 'checkmark' },
  no: { label: 'Не придёт', color: colors.red, bg: colors.redLight, icon: 'close' },
  pending: { label: 'Не ответил', color: colors.amber, bg: colors.amberLight, icon: 'time-outline' },
};
const DELIVERY: Record<string, [string, IconName]> = {
  queued: ['В очереди', 'hourglass-outline'], sending: ['Отправляется', 'paper-plane-outline'], sent: ['Отправлено', 'checkmark'],
  delivered: ['Доставлено', 'checkmark-done'], read: ['Прочитано', 'checkmark-done'], failed: ['Не доставлено', 'warning-outline'],
  skipped: ['Не отправлено', 'remove-circle-outline'], unknown: ['Проверяется', 'help-circle-outline'],
};
const FILTERS: { key: 'all' | Rsvp; label: string }[] = [
  { key: 'all', label: 'Все' }, { key: 'yes', label: 'Придут' }, { key: 'no', label: 'Не придут' }, { key: 'pending', label: 'Ждём' },
];

function confirmDelete(name: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`Удалить гостя ${name}?`));
  return new Promise((resolve) => Alert.alert('Удалить гостя?', name, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

export default function Guests() {
  const { id, flow } = useLocalSearchParams<{ id: string; flow?: string }>();
  const { data, error, reload, setData } = useRefresh(() => api.guests(id));
  const event = useRefresh(() => api.event(id), 15000);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Rsvp>('all');

  const remove = async (g: Guest) => {
    if (!(await confirmDelete(g.name))) return;
    setData((data ?? []).filter((x) => x.id !== g.id));
    await api.deleteGuest(id, g.id).catch(() => reload());
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((g) => (filter === 'all' || g.rsvp === filter) && (!q || g.name.toLowerCase().includes(q) || g.phone.includes(q.replace(/\D/g, '') || '#')));
  }, [data, query, filter]);

  const paid = event.data?.paymentStatus === 'paid';
  const count = data?.length ?? 0;
  const showNext = count > 0 && (flow || !paid);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: showNext ? 120 : 40, flexGrow: 1 }}
        data={list}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <ErrorText>{error}</ErrorText>
            <View style={styles.addRow}>
              <Pressable style={styles.addCard} onPress={() => router.push(`/event/${id}/contacts`)}>
                <View style={styles.addIcon}><Ionicons name="people" size={22} color="#fff" /></View>
                <T weight="bold" size={14}>Из контактов</T>
                <T size={12} color={colors.muted}>Отметить в телефонной книге</T>
              </Pressable>
              <Pressable style={styles.addCard} onPress={() => router.push(`/event/${id}/manual`)}>
                <View style={[styles.addIcon, { backgroundColor: colors.lime }]}><Ionicons name="keypad" size={20} color={colors.green} /></View>
                <T weight="bold" size={14}>Вручную</T>
                <T size={12} color={colors.muted}>Ввести имя и номер</T>
              </Pressable>
            </View>
            {count ? (
              <>
                <View style={styles.search}>
                  <Ionicons name="search" size={18} color={colors.muted} />
                  <TextInput style={styles.searchInput} placeholder="Поиск по имени или номеру" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} />
                </View>
                <View style={styles.filters}>
                  {FILTERS.map((f) => {
                    const n = f.key === 'all' ? count : (data ?? []).filter((g) => g.rsvp === f.key).length;
                    const on = filter === f.key;
                    return (
                      <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filter, on && styles.filterOn]}>
                        <T weight="semibold" size={13} color={on ? '#fff' : colors.textSoft}>{f.label} {n}</T>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={count ? <T color={colors.muted} style={{ textAlign: 'center', marginTop: 30 }}>Никого не найдено</T> : (
          <EmptyState icon="person-add-outline" title="Добавьте гостей" text="Выберите людей из контактов телефона или введите номер вручную." />
        )}
        renderItem={({ item }) => {
          const r = RSVP[item.rsvp];
          const d = item.messageStatus ? DELIVERY[item.messageStatus] : null;
          return (
            <View style={styles.guest}>
              <Avatar name={item.name} />
              <View style={{ flex: 1 }}>
                <T weight="bold" size={15} numberOfLines={1}>{item.name}</T>
                <T size={13} color={colors.muted}>{formatPhone(item.phone)}</T>
                {d ? (
                  <View style={styles.delivery}>
                    <Ionicons name={d[1]} size={13} color={item.messageStatus === 'failed' ? colors.red : colors.muted} />
                    <T size={12} color={item.messageStatus === 'failed' ? colors.red : colors.muted}>WhatsApp: {d[0]}</T>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Pill label={r.label} color={r.color} bg={r.bg} icon={r.icon} />
                <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel={`Удалить ${item.name}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />
      {showNext ? (
        <View style={styles.bottom}>
          <Button
            title={paid ? 'Готово' : `Далее: оплата · ${count} ${count === 1 ? 'гость' : 'гостей'}`}
            icon={paid ? 'checkmark' : 'arrow-forward'}
            onPress={() => paid ? router.back() : router.push(`/event/${id}/pay`)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  addCard: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  addIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: font.medium, color: colors.text, outlineStyle: 'none' } as object,
  filters: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  filterOn: { backgroundColor: colors.green, borderColor: colors.green },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: radius.lg, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 24 },
});
