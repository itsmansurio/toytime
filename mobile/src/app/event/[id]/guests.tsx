import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, type Guest } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors } from '../../../lib/theme';
import { formatPhone } from '../../../lib/phone';
import { Button, ErrorText } from '../../../components/ui';

const RSVP = { yes: ['Придёт', colors.green], no: ['Не придёт', colors.red], pending: ['Не ответил', colors.muted] } as const;
const DELIVERY: Record<string, string> = {
  queued: 'В очереди', sending: 'Отправляется', sent: 'Отправлено', delivered: 'Доставлено', read: 'Прочитано',
  failed: 'Ошибка доставки', skipped: 'Не отправлено', unknown: 'Проверяется',
};

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

  const remove = async (g: Guest) => {
    if (!(await confirmDelete(g.name))) return;
    setData((data ?? []).filter((x) => x.id !== g.id));
    await api.deleteGuest(id, g.id).catch(() => reload());
  };

  const paid = event.data?.paymentStatus === 'paid';
  const count = data?.length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        data={data ?? []}
        keyExtractor={(g) => g.id}
        ListHeaderComponent={
          <View>
            <ErrorText>{error}</ErrorText>
            <View style={styles.addRow}>
              <Button style={{ flex: 1 }} variant="outline" title="Из контактов" onPress={() => router.push(`/event/${id}/contacts`)} />
              <Button style={{ flex: 1 }} variant="outline" title="Вручную" onPress={() => router.push(`/event/${id}/manual`)} />
            </View>
            <Text style={styles.count}>Гостей: {count}</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Добавьте гостей из контактов телефона или введите номер вручную.</Text>}
        renderItem={({ item }) => (
          <View style={styles.guest}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.phone}>{formatPhone(item.phone)}</Text>
              {item.messageStatus ? <Text style={styles.delivery}>{DELIVERY[item.messageStatus] ?? item.messageStatus}</Text> : null}
            </View>
            <Text style={[styles.rsvp, { color: RSVP[item.rsvp][1] }]}>{RSVP[item.rsvp][0]}</Text>
            <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel={`Удалить ${item.name}`} style={styles.del}>
              <Text style={{ fontSize: 18, color: colors.muted }}>✕</Text>
            </Pressable>
          </View>
        )}
      />
      {count > 0 && (flow || !paid) ? (
        <View style={styles.bottom}>
          <Button
            title={paid ? 'Готово' : `Далее: оплата`}
            onPress={() => paid ? router.back() : router.push(`/event/${id}/pay`)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 10 },
  count: { marginTop: 16, marginBottom: 8, fontSize: 15, fontWeight: '600', color: colors.text },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 15, lineHeight: 21 },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 14, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.green, fontWeight: '700', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  phone: { fontSize: 13, color: colors.muted, marginTop: 2 },
  delivery: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rsvp: { fontSize: 13, fontWeight: '600' },
  del: { padding: 4 },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 24 },
});
