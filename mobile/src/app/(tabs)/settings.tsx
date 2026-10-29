import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSession } from '../../lib/session';
import { API_URL } from '../../lib/api';
import { colors, radius, themed } from '../../lib/theme';
import { router } from 'expo-router';
import { ErrorText, HeaderRow, IconTile, Ionicons, Row, SectionTitle, T, TestBanner } from '../../components/ui';
import { TopHeader } from '../../components/TopHeader';
import { useTheme } from '../../lib/themeContext';
import { LANGS, t } from '../../lib/i18n';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: t('Отмена'), style: 'cancel', onPress: () => resolve(false) },
    { text: t('Удалить'), style: 'destructive', onPress: () => resolve(true) },
  ]));
}

export default function Settings() {
  const { mode, pref, setPref, lang, setLang } = useTheme();
  const { config, revokeConsent } = useSession();
  const [error, setError] = useState<string | null>(null);

  const revoke = async () => {
    const ok = await confirm(t('Отозвать согласие?'), t('Все ваши мероприятия, списки гостей и их ответы будут удалены с сервера без возможности восстановления.'));
    if (!ok) return;
    try { await revokeConsent(); } catch (e) { setError(e instanceof Error ? e.message : t('Ошибка')); }
  };

  const testParts = [config?.testMode.whatsapp && t('сообщения WhatsApp не уходят реальным гостям'), config?.testMode.payments && t('оплата не списывается')].filter(Boolean);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <TopHeader title={t('Настройки')} subtitle={t('Данные, конфиденциальность и поддержка.')} />
      <View style={{ padding: 16 }}>
        <HeaderRow onBack={() => router.navigate('/')} />
      {testParts.length ? <TestBanner>{t('Тестовый режим')}: {testParts.join(', ')}.</TestBanner> : null}

      <SectionTitle>{t('Язык приложения')}</SectionTitle>
      <View style={[styles.segment, { marginBottom: 16 }]}>
        {LANGS.map((l) => {
          const on = lang === l.value;
          return (
            <Pressable key={l.value} onPress={() => setLang(l.value)} style={[styles.segItem, on && styles.segOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Ionicons name="language-outline" size={16} color={on ? colors.onPrimary : colors.textSoft} />
              <T weight="bold" size={13} color={on ? colors.onPrimary : colors.textSoft}>{l.label}</T>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>{t('Оформление')}</SectionTitle>
      <View style={styles.segment}>
        {([['light', 'sun', t('Светлая')], ['dark', 'moon', t('Тёмная')], ['system', 'monitor', t('Как в системе')]] as const).map(([key, icon, label]) => {
          const on = pref === key;
          return (
            <Pressable key={key} onPress={() => setPref(key)} style={[styles.segItem, on && styles.segOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Ionicons name={icon} size={16} color={on ? colors.onPrimary : colors.textSoft} />
              <T weight="bold" size={12} color={on ? colors.onPrimary : colors.textSoft}>{label}</T>
            </Pressable>
          );
        })}
      </View>
      <T size={12} color={colors.muted} style={{ marginTop: -10, marginBottom: 16, marginLeft: 2 }}>{mode === 'dark' ? t('Сейчас: тёмная тема') : t('Сейчас: светлая тема')}</T>

      <SectionTitle>{t('Приложение')}</SectionTitle>
      <View style={styles.group}>
        <Row icon="pricetag-outline" title={t('Стоимость')} value={t('{n} ₸ за той', { n: config?.priceKzt ?? 1000 })} last />
      </View>

      <SectionTitle>{t('Помощь')}</SectionTitle>
      <View style={styles.group}>
        <Row icon="shield-checkmark-outline" title={t('Конфиденциальность')} onPress={() => Linking.openURL(`${API_URL}/privacy`)} />
        <Row icon="chatbubble-ellipses-outline" title={t('Поддержка')} onPress={() => Linking.openURL('mailto:support@toitime.kz')} last />
      </View>

      <View style={styles.safe}>
        <IconTile name="lock-closed" size={44} color={colors.onPrimary} bg={colors.primary} />
        <View style={{ flex: 1 }}>
          <T weight="bold" size={15}>{t('Ваши данные в безопасности')}</T>
          <T size={13} color={colors.textSoft} style={{ marginTop: 3 }}>
            {t('Без рекламы. Контакты читаются только на телефоне — на сервер уходят лишь выбранные гости.')}
          </T>
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      <View style={styles.group}>
        <Row icon="trash-outline" title={t('Отозвать согласие и удалить данные')} onPress={revoke} danger last />
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
