import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors, radius, shadow } from '../../../lib/theme';
import { formatDate, pluralGuests } from '../../../lib/format';
import { Button, ErrorText, IconTile, Ionicons, T, TestBanner, type IconName } from '../../../components/ui';

function Line({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={17} color={colors.muted} />
      <T size={14} color={colors.muted} style={{ flex: 1 }}>{label}</T>
      <T weight="semibold" size={14} style={{ flexShrink: 1, textAlign: 'right' }} numberOfLines={1}>{value}</T>
    </View>
  );
}

export default function Pay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, reload } = useRefresh(() => api.event(id), 5000);
  const [stage, setStage] = useState<'idle' | 'paying' | 'waiting' | 'sending'>('idle');
  const [testMode, setTestMode] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const polling = useRef(false);

  useEffect(() => { api.payment(id).then((p) => setTestMode(p.testMode)).catch(() => {}); }, [id]);
  useEffect(() => () => { polling.current = false; }, []);

  const sendInvites = async () => {
    setStage('sending');
    try {
      await api.send(id);
      router.replace(`/event/${id}/done`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setStage('idle');
    }
  };

  // Ждём подтверждения от сервера. Сервер ставит «оплачено» только после
  // подписанного уведомления платёжного провайдера.
  const waitForServer = async () => {
    setStage('waiting');
    polling.current = true;
    for (let i = 0; i < 60 && polling.current; i++) {
      const p = await api.payment(id).catch(() => null);
      if (p?.paymentStatus === 'paid') { polling.current = false; await sendInvites(); return; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    polling.current = false;
    setStage('idle');
    reload();
    setError('Оплата пока не подтверждена. Если вы оплатили, подождите минуту и нажмите «Проверить оплату».');
  };

  const pay = async () => {
    setError(null);
    setStage('paying');
    try {
      const payment = await api.createPayment(id);
      await WebBrowser.openBrowserAsync(payment.checkoutUrl);
      await waitForServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setStage('idle');
    }
  };

  const paid = event?.paymentStatus === 'paid';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
      {testMode ? <TestBanner>Тестовый режим: платёжный провайдер не подключён, деньги не списываются.</TestBanner> : null}
      <View style={styles.receipt}>
        <View style={styles.receiptTop}>
          <IconTile name="receipt-outline" size={52} color="#fff" bg="rgba(255,255,255,0.16)" />
          <T weight="medium" size={14} color="#CFE6D8" style={{ marginTop: 14 }}>К оплате</T>
          <T weight="extrabold" size={44} color="#fff" style={{ lineHeight: 52 }}>1 000 ₸</T>
          <T size={13} color="#CFE6D8">Одна цена за мероприятие, сколько бы ни было гостей</T>
        </View>
        <View style={styles.receiptBody}>
          <Line icon="sparkles-outline" label="Мероприятие" value={event?.title ?? '—'} />
          <Line icon="calendar-outline" label="Дата" value={event ? `${formatDate(event.eventDate)}, ${event.eventTime}` : '—'} />
          <Line icon="people-outline" label="Гости" value={pluralGuests(event?.stats?.total ?? 0)} />
          <Line icon="logo-whatsapp" label="Приглашение + 3 напоминания" value="включено" />
        </View>
      </View>
      <View style={styles.secure}>
        <Ionicons name="shield-checkmark" size={18} color={colors.green} />
        <T size={13} color={colors.textSoft} style={{ flex: 1 }}>
          Оплата на защищённой странице провайдера. Приглашения уйдут сразу, как только сервер получит подтверждение.
        </T>
      </View>
      <ErrorText>{error}</ErrorText>
      {paid ? (
        <Button title="Отправить приглашения" icon="paper-plane" onPress={sendInvites} loading={stage === 'sending'} />
      ) : (
        <>
          <Button title={stage === 'waiting' ? 'Ждём подтверждения оплаты…' : 'Оплатить 1 000 ₸'} icon="card" onPress={pay}
            loading={stage === 'paying' || stage === 'sending'} disabled={stage === 'waiting'} />
          {event?.paymentStatus === 'pending' && stage === 'idle' ? (
            <Button title="Проверить оплату" icon="refresh" variant="ghost" onPress={waitForServer} style={{ marginTop: 6 }} />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  receipt: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 14, ...shadow },
  receiptTop: { backgroundColor: colors.green, alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  receiptBody: { padding: 18, gap: 14 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secure: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.greenLight, borderRadius: radius.md, padding: 14, marginBottom: 14 },
});
