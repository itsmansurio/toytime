import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { api, type Guest, type Rsvp } from '../../lib/api';
import { useCurrentEvent } from '../../lib/current';
import { useRefresh } from '../../lib/useRefresh';
import { colors, radius, themed } from '../../lib/theme';
import { formatPhone, normalizePhone } from '../../lib/phone';
import { Button, Card, Checkbox, EmptyState, ErrorText, Field, Ionicons, Muted, SectionTitle, Skeleton, T } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';
import { useToast } from '../../components/Toast';
import { rsvpLabel } from '../../lib/status';
import { useTheme } from '../../lib/themeContext';

const DELIVERY: Record<string, string> = {
  queued: 'в очереди', sending: 'отправляется', sent: 'отправлено', delivered: 'доставлено', read: 'прочитано',
  failed: 'не доставлено', skipped: 'не отправлено', unknown: 'проверяется',
};

function guestWord(n: number) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'гость';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'гостя';
  return 'гостей';
}

function confirmDelete(name: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`Удалить гостя ${name}?`));
  return new Promise((resolve) => Alert.alert('Удалить гостя?', name, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

function GuestRow({ guest, last, open, onToggleOpen, onSelect, onStatus, onRemove }: {
  guest: Guest; last: boolean; open: boolean; onToggleOpen: () => void; onSelect: () => void; onStatus: (r: Rsvp) => void; onRemove: () => void;
}) {
  const st = rsvpLabel(guest.rsvp);
  const sub = guest.rsvpSource === 'organizer' ? 'отмечено вами' : guest.messageStatus ? `WhatsApp: ${DELIVERY[guest.messageStatus] ?? guest.messageStatus}` : null;
  return (
    <View style={!last && styles.guestWrap}>
      <View style={styles.guest}>
        <Pressable onPress={onSelect} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: guest.selected }} accessibilityLabel={`Выбрать ${guest.name}`}>
          <Checkbox checked={guest.selected} />
        </Pressable>
        <View style={styles.avatar}><T weight="extrabold" size={15} color={colors.green}>{guest.name.slice(0, 1).toUpperCase()}</T></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="bold" size={14} numberOfLines={1}>{guest.name}</T>
          <T size={12} color={colors.muted}>{formatPhone(guest.phone)}</T>
          {sub ? <T size={11} color={guest.messageStatus === 'failed' ? colors.red : colors.muted}>{sub}</T> : null}
        </View>
        <Pressable onPress={onToggleOpen} style={[styles.select, { backgroundColor: st.bg }]} accessibilityLabel="Статус">
          <T weight="bold" size={11} color={st.color}>{st.label}</T>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={st.color} />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Удалить ${guest.name}`}>
          <Ionicons name="close" size={19} color={colors.muted} />
        </Pressable>
      </View>
      {open ? (
        <View style={styles.options}>
          {(['pending', 'yes', 'no'] as Rsvp[]).map((r) => (
            <Pressable key={r} onPress={() => onStatus(r)} style={[styles.option, guest.rsvp === r && { backgroundColor: rsvpLabel(r).bg }]}>
              <T weight="bold" size={12} color={guest.rsvp === r ? rsvpLabel(r).color : colors.textSoft}>{rsvpLabel(r).label}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function Guests() {
  useTheme();
  const { event, loading: eventLoading } = useCurrentEvent(30000);
  const id = event?.id;
  const { data, error, reload, setData, loading } = useRefresh(() => (id ? api.guests(id) : Promise.resolve([] as Guest[])));
  useEffect(() => { reload(); }, [id, reload]);
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const guests = data ?? [];

  const patch = (g: Guest, changes: Partial<Guest>) => setData(guests.map((x) => (x.id === g.id ? { ...x, ...changes } : x)));

  const add = async () => {
    if (!id) return;
    if (!name.trim()) { setFormError('Введите имя гостя'); return; }
    const normalized = normalizePhone(phone);
    if (!normalized) { setFormError('Введите номер WhatsApp в формате +7 7XX XXX XX XX'); return; }
    setAdding(true);
    setFormError(null);
    try {
      const res = await api.addGuests(id, [{ name: name.trim(), phone: normalized }]);
      if (res.rejected.length) { setFormError(res.rejected[0].reason); return; }
      setName(''); setPhone('');
      toast('Гость добавлен');
      reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setAdding(false);
    }
  };

  const selectAll = async () => {
    if (!id) return;
    const all = guests.every((g) => g.selected);
    setData(guests.map((g) => ({ ...g, selected: !all })));
    await api.selectAllGuests(id, !all).catch(() => reload());
  };

  const toggle = async (g: Guest) => {
    patch(g, { selected: !g.selected });
    await api.updateGuest(id!, g.id, { selected: !g.selected }).catch(() => reload());
  };

  const setStatus = async (g: Guest, rsvp: Rsvp) => {
    setOpenId(null);
    patch(g, { rsvp, rsvpSource: rsvp === 'pending' ? null : 'organizer' });
    try { await api.updateGuest(id!, g.id, { rsvp }); toast('Статус гостя обновлён'); } catch { reload(); }
  };

  const remove = async (g: Guest) => {
    if (!(await confirmDelete(g.name))) return;
    setData(guests.filter((x) => x.id !== g.id));
    await api.deleteGuest(id!, g.id).catch(() => reload());
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <TopHeader />
        <View style={{ padding: 16 }}>
          <SectionTitle right={`${guests.length} ${guestWord(guests.length)}`}>Список гостей</SectionTitle>
          {!event ? (
            !eventLoading ? (
              <Card>
                <EmptyState compact icon="calendar-outline" title="Сначала создайте мероприятие" text="Гости добавляются к мероприятию — это займёт минуту."
                  action="Создать мероприятие" onAction={() => router.navigate({ pathname: '/event', params: { mode: 'new' } })} />
              </Card>
            ) : null
          ) : (
            <>
              <Card>
                <Field label="Имя гостя" placeholder="Например, Данияр" value={name} onChangeText={setName} maxLength={100} />
                <Field label="Номер WhatsApp" placeholder="+7 7XX XXX XX XX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />
                <ErrorText>{formError}</ErrorText>
                <Button title="Добавить гостя" icon="add" size="md" onPress={add} loading={adding} />
                <View style={styles.btnrow}>
                  <Button title="Из контактов" icon="people-outline" variant="light" size="md" style={{ flex: 1 }} onPress={() => router.push(`/event/${id}/contacts`)} />
                  <Button title="Выбрать всех" variant="outline" size="md" style={{ flex: 1 }} onPress={selectAll} disabled={!guests.length} />
                </View>
              </Card>
              <ErrorText>{error}</ErrorText>
              <View style={[styles.listCard]}>
                {loading && !data ? [0, 1, 2].map((i) => (
                  <View key={i} style={[styles.guest, { gap: 12 }]}>
                    <Skeleton width={40} height={40} radius={14} />
                    <View style={{ flex: 1, gap: 8 }}><Skeleton width="55%" /><Skeleton width="35%" height={11} /></View>
                  </View>
                )) : guests.length ? guests.map((g, i) => (
                  <GuestRow key={g.id} last={i === guests.length - 1} guest={g} open={openId === g.id} onToggleOpen={() => setOpenId(openId === g.id ? null : g.id)}
                    onSelect={() => toggle(g)} onStatus={(r) => setStatus(g, r)} onRemove={() => remove(g)} />
                )) : (
                  <EmptyState compact icon="people-outline" title="Пока нет гостей" text="Добавьте первого гостя выше или выберите сразу нескольких из контактов телефона."
                    action="Выбрать из контактов" onAction={() => router.push(`/event/${id}/contacts`)} />
                )}
              </View>
              <Button title="Перейти к приглашению" icon="arrow-forward" size="md" onPress={() => router.navigate('/send')} disabled={!guests.length} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  btnrow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  guestWrap: { borderBottomWidth: 1, borderBottomColor: colors.border },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  select: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7 },
  options: { flexDirection: 'row', gap: 6, paddingBottom: 12, paddingLeft: 78, justifyContent: 'flex-end' },
  option: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: colors.bg },
}));
