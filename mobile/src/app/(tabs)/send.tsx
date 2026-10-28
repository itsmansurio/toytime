import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api, type EventItem, type Guest } from '../../lib/api';
import { useCurrentEvent } from '../../lib/current';
import { useRefresh } from '../../lib/useRefresh';
import { useSession } from '../../lib/session';
import { colors, themed } from '../../lib/theme';
import { formatDate } from '../../lib/format';
import { formatPhone } from '../../lib/phone';
import { Button, Card, CheckLine, Divider, EmptyState, ErrorText, HeaderRow, Muted, SectionTitle, SkeletonCard, T } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../lib/themeContext';

// Тот же текст, что в шаблоне WhatsApp на сервере (integrations/whatsapp-templates.js).
function previewText(e: EventItem, guestName: string) {
  return `Ассаламу алейкум, ${guestName}!\n\n${e.hostName || 'Организатор праздника'} приглашает вас на мероприятие «${e.title}».\n\n` +
    `📅 Дата: ${formatDate(e.eventDate)}\n🕒 Время: ${e.eventTime}\n📍 Место: ${e.address}\n\n${e.invitationText}\n\n` +
    'Пожалуйста, ответьте по кнопке ниже, придёте ли вы. Чтобы не получать сообщения, напишите СТОП.\n\n[Ответить]';
}

// «Приглашение гостям» — шаг 3 из 3: кому отправить, напоминания, согласие и предпросмотр.
export default function Send() {
  useTheme();
  const { event, loading: eventLoading, reload: reloadEvent } = useCurrentEvent(10000);
  const id = event?.id;
  const { data, reload, setData } = useRefresh(() => (id ? api.guests(id) : Promise.resolve([] as Guest[])));
  useEffect(() => { reload(); }, [id, reload]);
  const { config } = useSession();
  const toast = useToast();
  const [optin, setOptin] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (event) setReminders(event.remindersEnabled); }, [event?.id, event?.remindersEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const guests = data ?? [];
  const selected = guests.filter((g) => g.selected);
  const paid = event?.paymentStatus === 'paid';

  const toggle = async (g: Guest) => {
    setData(guests.map((x) => (x.id === g.id ? { ...x, selected: !x.selected } : x)));
    await api.updateGuest(id!, g.id, { selected: !g.selected }).catch(() => reload());
  };
  const selectAll = async () => {
    const all = guests.every((g) => g.selected);
    setData(guests.map((g) => ({ ...g, selected: !all })));
    await api.selectAllGuests(id!, !all).catch(() => reload());
  };
  const toggleReminders = async () => {
    setReminders(!reminders);
    await api.updateEvent(id!, { reminders_enabled: !reminders }).catch(() => setReminders(reminders));
    reloadEvent();
  };

  const send = async () => {
    setError(null);
    if (!selected.length) { toast('Выберите хотя бы одного гостя'); return; }
    if (!optin) { toast('Подтвердите согласие гостей на сообщения'); return; }
    if (!paid) { router.navigate('/payment'); return; }
    setSending(true);
    try {
      const res = await api.send(id!);
      toast(res.queued ? `Приглашение отправляется ${res.queued} гостям` : 'Новых получателей нет — всем выбранным уже отправлено');
      reload();
      reloadEvent();
      if (res.queued && !event?.invitesSentAt) router.push(`/event/${id}/done`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  };

  // Организатор открывает настоящую страницу гостя — так он увидит приглашение его глазами.
  const openGuestPage = async () => {
    const g = selected[0] ?? guests[0];
    if (!g) { toast('Сначала добавьте гостей'); router.navigate('/guests'); return; }
    try {
      const { url } = await api.guestLink(id!, g.id);
      if (Platform.OS === 'web') Linking.openURL(url); else await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const sendTitle = !paid ? 'Оплатить и отправить приглашение' : event?.invitesSentAt ? 'Отправить новым гостям' : 'Отправить приглашение';
  const testMode = config?.testMode.whatsapp;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <TopHeader />
      <View style={{ padding: 16 }}>
        <HeaderRow onBack={() => router.navigate('/guests')} backLabel="К гостям" right="Шаг 3 из 3" />
        <SectionTitle>Приглашение гостям</SectionTitle>
        {!event ? (eventLoading ? <SkeletonCard tall /> : (
          <Card><EmptyState compact icon="calendar-outline" title="Сначала создайте мероприятие" text="Приглашение собирается из данных мероприятия." action="Создать мероприятие" onAction={() => router.navigate({ pathname: '/event', params: { mode: 'new' } })} /></Card>
        )) : (
          <>
            <Card>
              <View style={styles.eventtop}>
                <View>
                  <T weight="bold" size={15}>Кому отправить</T>
                  <Muted>Выбрано: {selected.length}</Muted>
                </View>
                <Button title="Выбрать всех" variant="light" size="md" onPress={selectAll} disabled={!guests.length} />
              </View>
              <View style={{ marginTop: 8 }}>
                {guests.length ? guests.map((g) => (
                  <CheckLine key={g.id} checked={g.selected} onPress={() => toggle(g)}>
                    <T size={13}>{g.name} <T size={12} color={colors.muted}>· {formatPhone(g.phone)}</T></T>
                  </CheckLine>
                )) : <EmptyState compact icon="user-plus" title="Некому отправлять" text="Добавьте гостей — и приглашение уйдёт им в WhatsApp." action="Добавить гостей" onAction={() => router.navigate('/guests')} />}
              </View>
              <Divider />
              <CheckLine checked={reminders} onPress={toggleReminders}>Напомнить тем, кто не ответил</CheckLine>
              <CheckLine checked={optin} onPress={() => setOptin(!optin)}>Я подтверждаю, что гости согласились получать сообщения</CheckLine>
              <ErrorText>{error}</ErrorText>
              <Button title={sendTitle} size="md" onPress={send} loading={sending} style={{ marginTop: 6 }} />
              <Muted style={{ marginTop: 10 }}>
                {testMode
                  ? 'Сейчас тестовый режим: сообщения попадают в эмулятор и не уходят реальным гостям. Настоящая отправка заработает после подключения официального WhatsApp Business API и одобрения шаблонов.'
                  : 'Приглашение уйдёт выбранным гостям в WhatsApp. Напоминания получат только те, кто не ответил.'}
                {!paid ? ' Перед отправкой нужно оплатить мероприятие — 1000 ₸.' : ''}
              </Muted>
            </Card>

            <SectionTitle>Предпросмотр сообщения</SectionTitle>
            <View style={styles.preview}>
              <View style={styles.bubble}><T size={14} style={{ lineHeight: 20 }}>{previewText(event, selected[0]?.name ?? 'Имя гостя')}</T></View>
              <Muted style={{ marginTop: 9 }}>Гость получит ссылку с кнопками «Приду» и «Не смогу прийти» — устанавливать ToiTime не нужно.</Muted>
            </View>

            <Card style={{ marginTop: 14 }}>
              <T weight="bold" size={15}>Что увидит гость</T>
              <View style={styles.btnrow}>
                <Button title="Приду" icon="checkmark" variant="lime" size="md" style={{ flex: 1 }} onPress={openGuestPage} />
                <Button title="Не смогу" variant="outline" size="md" style={{ flex: 1 }} onPress={openGuestPage} />
              </View>
              <Muted style={{ marginTop: 8 }}>
                Нажмите, чтобы открыть настоящую страницу гостя{selected[0] ? ` ${selected[0].name}` : ''}. Ответ, нажатый там, засчитается этому гостю и сразу появится в статистике.
              </Muted>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  eventtop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  preview: { backgroundColor: colors.greenLight, padding: 16, borderRadius: 16 },
  bubble: { backgroundColor: colors.card, padding: 14, borderTopLeftRadius: 5, borderTopRightRadius: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  btnrow: { flexDirection: 'row', gap: 8, marginTop: 12 },
}));
