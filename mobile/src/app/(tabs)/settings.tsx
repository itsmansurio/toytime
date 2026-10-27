import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../lib/session';
import { API_URL } from '../../lib/api';
import { colors } from '../../lib/theme';
import { Button, Card, ErrorText, TestBanner } from '../../components/ui';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

function Row({ title, value, onPress }: { title: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value ?? (onPress ? '›' : '')}</Text>
    </Pressable>
  );
}

export default function Settings() {
  const { config, revokeConsent } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const revoke = async () => {
    const ok = await confirm('Отозвать согласие?', 'Все ваши мероприятия, списки гостей и их ответы будут удалены с сервера без возможности восстановления.');
    if (!ok) return;
    setBusy(true);
    try { await revokeConsent(); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {config && (config.testMode.whatsapp || config.testMode.payments) ? (
        <TestBanner>
          Тестовый режим: {config.testMode.whatsapp ? 'сообщения WhatsApp не отправляются реальным гостям' : ''}
          {config.testMode.whatsapp && config.testMode.payments ? ', ' : ''}
          {config.testMode.payments ? 'оплата не списывается' : ''}.
        </TestBanner>
      ) : null}
      <Card style={{ padding: 0 }}>
        <Row title="Язык приложения" value="Русский" />
        <Row title="Стоимость" value={`${config?.priceKzt ?? 1000} ₸ за мероприятие`} />
        <Row title="Политика конфиденциальности" onPress={() => Linking.openURL(`${API_URL}/privacy`)} />
        <Row title="Поддержка" onPress={() => Linking.openURL('mailto:support@toytime.kz')} />
      </Card>
      <Card style={{ backgroundColor: colors.greenLight }}>
        <Text style={styles.safeTitle}>🛡️ Ваши данные в безопасности</Text>
        <Text style={styles.safeText}>
          Мы не показываем рекламу и не передаём контакты третьим лицам. Контакты телефона читаются только на устройстве, на сервер уходят лишь выбранные гости.
        </Text>
      </Card>
      <View style={{ marginTop: 12 }}>
        <ErrorText>{error}</ErrorText>
        <Button title="Отозвать согласие и удалить данные" variant="danger" onPress={revoke} loading={busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { fontSize: 16, color: colors.text },
  rowValue: { fontSize: 15, color: colors.muted },
  safeTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  safeText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
