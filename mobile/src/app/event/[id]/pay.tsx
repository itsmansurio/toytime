import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../../lib/api';
import { useRefresh } from '../../../lib/useRefresh';
import { colors } from '../../../lib/theme';
import { formatDate, pluralGuests } from '../../../lib/format';
import { Button, Card, ErrorText, TestBanner } from '../../../components/ui';

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
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {testMode ? <TestBanner>Тестовый режим: реальный платёжный провайдер не подключён, деньги не списываются.</TestBanner> : null}
      <Card style={{ backgroundColor: colors.greenLight }}>
        <Text style={styles.event}>{event?.title ?? ' '}</Text>
        <Text style={styles.meta}>{event ? `${formatDate(event.eventDate)}, ${event.eventTime} · ${pluralGuests(event.stats?.total ?? 0)}` : ' '}</Text>
        <Text style={styles.price}>1 000 ₸</Text>
        <Text style={styles.meta}>Одна цена за мероприятие, независимо от числа гостей</Text>
      </Card>
      <View style={styles.info}>
        <Text style={styles.infoText}>
          ℹ️ Оплата проходит на защищённой странице платёжного провайдера. Приглашения уйдут сразу после того, как сервер получит подтверждение оплаты.
        </Text>
      </View>
      <ErrorText>{error}</ErrorText>
      {paid ? (
        <Button title="Отправить приглашения" onPress={sendInvites} loading={stage === 'sending'} />
      ) : (
        <>
          <Button title={stage === 'waiting' ? 'Ждём подтверждения оплаты…' : 'Оплатить 1 000 ₸'} onPress={pay} loading={stage === 'paying' || stage === 'sending'} disabled={stage === 'waiting'} />
          {event?.paymentStatus === 'pending' && stage === 'idle' ? (
            <Button title="Проверить оплату" variant="ghost" onPress={waitForServer} />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  event: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  price: { fontSize: 40, fontWeight: '800', color: colors.green, marginTop: 14 },
  info: { padding: 12, marginBottom: 12 },
  infoText: { fontSize: 13, color: colors.muted, lineHeight: 19 },
});
