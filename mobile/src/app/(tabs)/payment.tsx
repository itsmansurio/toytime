import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../lib/api';
import { useCurrentEvent } from '../../lib/current';
import { useSession } from '../../lib/session';
import { colors, themed } from '../../lib/theme';
import { Button, Card, Divider, EmptyState, ErrorText, Muted, Pill, SectionTitle, SkeletonCard, T } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../lib/themeContext';

function confirmDelete(): Promise<boolean> {
  const msg = 'Мероприятие, гости и их ответы будут удалены.';
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg));
  return new Promise((resolve) => Alert.alert('Удалить мероприятие?', msg, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

export default function Payment() {
  useTheme();
  const { event, loading, reload, setCurrentId } = useCurrentEvent(5000);
  const { config } = useSession();
  const toast = useToast();
  const [stage, setStage] = useState<'idle' | 'paying' | 'waiting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const polling = useRef(false);
  useEffect(() => () => { polling.current = false; }, []);

  const price = (config?.priceKzt ?? 1000).toLocaleString('ru-RU');
  const status = event?.paymentStatus;
  const pill = status === 'paid' ? { label: 'Оплачено', color: colors.yes, bg: colors.yesLight }
    : status === 'pending' ? { label: 'Ждёт подтверждения', color: colors.amber, bg: colors.amberLight }
    : { label: 'Не оплачено', color: colors.notice, bg: colors.goldLight };

  // «Оплачено» ставит только сервер — после подписанного уведомления провайдера.
  const waitForServer = async (id: string) => {
    setStage('waiting');
    polling.current = true;
    for (let i = 0; i < 60 && polling.current; i++) {
      const p = await api.payment(id).catch(() => null);
      if (p?.paymentStatus === 'paid') {
        polling.current = false;
        setStage('idle');
        await reload();
        toast('Оплата подтверждена');
        router.navigate('/send');
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    polling.current = false;
    setStage('idle');
    reload();
    setError('Оплата пока не подтверждена. Если вы оплатили, подождите минуту — статус обновится сам.');
  };

  const pay = async () => {
    if (!event) return;
    setError(null);
    setStage('paying');
    try {
      const payment = await api.createPayment(event.id);
      await WebBrowser.openBrowserAsync(payment.checkoutUrl);
      await waitForServer(event.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setStage('idle');
    }
  };

  const remove = async () => {
    if (!event || !(await confirmDelete())) return;
    await api.deleteEvent(event.id);
    setCurrentId(null);
    await reload();
    toast('Мероприятие удалено');
    router.navigate('/');
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <TopHeader />
      <View style={{ padding: 16 }}>
        <SectionTitle>Оплата мероприятия</SectionTitle>
        {loading && !event ? <SkeletonCard lines={4} /> : !event ? (
          <Card><EmptyState compact icon="wallet" title="Нечего оплачивать" text="Создайте мероприятие — оплата 1000 ₸ один раз за той." action="Создать мероприятие" onAction={() => router.navigate({ pathname: '/event', params: { mode: 'new' } })} /></Card>
        ) : null}
        {event ? <Card>
          <Muted>Стоимость одного мероприятия</Muted>
          <T weight="extrabold" size={29} style={{ letterSpacing: -1, lineHeight: 36 }}>
            {price} ₸ <T weight="semibold" size={13} color={colors.muted}>/ мероприятие</T>
          </T>
          <Divider />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <T weight="bold" size={15}>{event?.title ?? 'Ваш той'}</T>
              <Muted>Без рекламы · без оплаты за каждого гостя</Muted>
            </View>
            <Pill {...pill} />
          </View>
          <Divider />
          <View style={styles.row}><Muted>Количество гостей</Muted><T weight="bold">{event?.stats?.total ?? 0}</T></View>
          <View style={[styles.row, { marginTop: 10 }]}><Muted>К оплате</Muted><T weight="bold">{status === 'paid' ? '0 ₸' : `${price} ₸`}</T></View>
          <ErrorText>{error}</ErrorText>
          {status === 'paid' ? (
            <Button title="Перейти к рассылке" icon="arrow-forward" size="md" style={{ marginTop: 16 }} onPress={() => router.navigate('/send')} />
          ) : (
            <Button title={stage === 'waiting' ? 'Ждём подтверждения оплаты…' : `Оплатить ${price} ₸`} size="md" style={{ marginTop: 16 }}
              onPress={pay} loading={stage === 'paying'} disabled={!event || stage === 'waiting'} />
          )}
          <Muted style={{ marginTop: 10 }}>
            {config?.testMode.payments
              ? 'Оплата сейчас тестовая: деньги не списываются. Для запуска подключим платёжного провайдера в Казахстане — например, Kaspi Pay или другой эквайринг.'
              : 'Оплата проходит на защищённой странице провайдера. Статус «Оплачено» ставит сервер после подтверждения.'}
          </Muted>
        </Card> : null}
        <Card>
          <T weight="bold" size={15}>Что входит в стоимость</T>
          <Muted style={{ marginTop: 6 }}>
            Создание мероприятия, список гостей без ограничений, отправка приглашений в WhatsApp, сбор ответов «Приду / Не смогу»
            и до трёх напоминаний тем, кто не ответил.
          </Muted>
        </Card>
        {event ? <Button title="Удалить мероприятие" variant="outline" size="md" onPress={remove} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
}));
