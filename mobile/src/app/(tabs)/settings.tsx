import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSession } from '../../lib/session';
import { API_URL } from '../../lib/api';
import { colors, radius, themed } from '../../lib/theme';
import { router } from 'expo-router';
import { ErrorText, HeaderRow, IconTile, Ionicons, Row, SectionTitle, T, TestBanner } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';
import { useTheme } from '../../lib/themeContext';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Удалить', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

export default function Settings() {
  const { mode, pref, setPref } = useTheme();
  const { config, revokeConsent } = useSession();
  const [error, setError] = useState<string | null>(null);

  const revoke = async () => {
    const ok = await confirm('Отозвать согласие?', 'Все ваши мероприятия, списки гостей и их ответы будут удалены с сервера без возможности восстановления.');
    if (!ok) return;
    try { await revokeConsent(); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка'); }
  };

  const testParts = [config?.testMode.whatsapp && 'сообщения WhatsApp не уходят реальным гостям', config?.testMode.payments && 'оплата не списывается'].filter(Boolean);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <TopHeader title="Настройки" subtitle="Данные, конфиденциальность и поддержка." />
      <View style={{ padding: 16 }}>
        <HeaderRow onBack={() => router.navigate('/')} />
      {testParts.length ? <TestBanner>Тестовый режим: {testParts.join(', ')}.</TestBanner> : null}

      <SectionTitle>Оформление</SectionTitle>
      <View style={styles.segment}>
        {([['light', 'sun', 'Светлая'], ['dark', 'moon', 'Тёмная'], ['system', 'monitor', 'Как в системе']] as const).map(([key, icon, label]) => {
          const on = pref === key;
          return (
            <Pressable key={key} onPress={() => setPref(key)} style={[styles.segItem, on && styles.segOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Ionicons name={icon} size={16} color={on ? colors.onPrimary : colors.textSoft} />
              <T weight="bold" size={12} color={on ? colors.onPrimary : colors.textSoft}>{label}</T>
            </Pressable>
          );
        })}
      </View>
      <T size={12} color={colors.muted} style={{ marginTop: -10, marginBottom: 16, marginLeft: 2 }}>Сейчас: {mode === 'dark' ? 'тёмная' : 'светлая'} тема</T>

      <SectionTitle>Приложение</SectionTitle>
      <View style={styles.group}>
        <Row icon="language-outline" title="Язык приложения" value="Русский" />
        <Row icon="pricetag-outline" title="Стоимость" value={`${config?.priceKzt ?? 1000} ₸ за той`} last />
      </View>

      <SectionTitle>Помощь</SectionTitle>
      <View style={styles.group}>
        <Row icon="shield-checkmark-outline" title="Конфиденциальность" onPress={() => Linking.openURL(`${API_URL}/privacy`)} />
        <Row icon="chatbubble-ellipses-outline" title="Поддержка" onPress={() => Linking.openURL('mailto:support@toitime.kz')} last />
      </View>

      <View style={styles.safe}>
        <IconTile name="lock-closed" size={44} color={colors.onPrimary} bg={colors.primary} />
        <View style={{ flex: 1 }}>
          <T weight="bold" size={15}>Ваши данные в безопасности</T>
          <T size={13} color={colors.textSoft} style={{ marginTop: 3 }}>
            Без рекламы. Контакты читаются только на телефоне — на сервер уходят лишь выбранные гости.
          </T>
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      <View style={styles.group}>
        <Row icon="trash-outline" title="Отозвать согласие и удалить данные" onPress={revoke} danger last />
      </View>
      <T size={12} color={colors.muted} style={{ textAlign: 'center', marginTop: 8 }}>ToiTime 1.0 · MVP</T>
      </View>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 18, borderWidth: 1, borderColor: colors.border },
  safe: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.goldLight, borderRadius: radius.lg, padding: 16, marginBottom: 18 },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: 4, gap: 4, marginBottom: 18, borderWidth: 1, borderColor: colors.border },
  segItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.md },
  segOn: { backgroundColor: colors.primary },
}));
