import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '../lib/session';
import { API_URL } from '../lib/api';
import { colors, radius, themed } from '../lib/theme';
import { ErrorText, Ionicons, T, type IconName } from '../components/ui';
import { Brand } from '../components/TopHeader';
import { useTheme } from '../lib/themeContext';
import { t } from '../lib/i18n';
import { LangSwitch } from '../components/LangSwitch';

const FEATURES = (): [IconName, string, string][] => [
  ['create-outline', t('Мероприятие за 2 минуты'), t('Название, дата, место и текст приглашения')],
  ['people-outline', t('Гости из контактов'), t('Отметьте нужных людей в телефонной книге')],
  ['logo-whatsapp', t('Приглашения в WhatsApp'), t('С фото или видео и напоминаниями в 9:00')],
];

export default function Welcome() {
  useTheme();
  const { signIn } = useSession();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Ошибка'));
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.header }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <Brand size={26} />
            <LangSwitch />
          </View>
          <T weight="extrabold" size={32} color="#fff" style={styles.headline}>{t('Той начинается\nс хорошей\nорганизации.')}</T>
          <T size={14} color="#C6D8D0" style={{ marginBottom: 28 }}>{t('Приглашения, ответы гостей и напоминания — в одном месте.')}</T>

          <View style={{ gap: 12 }}>
            {FEATURES().map(([icon, title, text]) => (
              <View key={title} style={styles.feature}>
                <View style={styles.featureIcon}><Ionicons name={icon} size={22} color={colors.onLime} /></View>
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={15} color="#fff">{title}</T>
                  <T size={13} color="#C6D8D0">{text}</T>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />
          <Pressable style={styles.consent} onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>
              {consent ? <Ionicons name="checkmark" size={16} color={colors.onLime} /> : null}
            </View>
            <T size={13} color="#CFE6D8" style={{ flex: 1 }}>
              {t('Согласен(на) на обработку персональных данных — моих и моих гостей — для отправки приглашений.')}{' '}
              <T size={13} weight="semibold" color="#fff" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${API_URL}/privacy`)}>
                {t('Политика конфиденциальности')}
              </T>
            </T>
          </Pressable>
          <ErrorText>{error}</ErrorText>
          <Pressable
            style={({ pressed }) => [styles.start, (!consent || loading) && { opacity: 0.55 }, pressed && { opacity: 0.9 }]}
            disabled={!consent || loading}
            onPress={start}
            accessibilityRole="button"
          >
            <T weight="bold" size={17} color={colors.onLime}>{loading ? t('Подождите…') : t('Начать')}</T>
            {!loading ? <Ionicons name="arrow-forward" size={20} color={colors.onLime} /> : null}
          </Pressable>
          <View style={styles.footer}>
            {[t('Без рекламы'), t('Просто'), t('Удобно')].map((word, i) => (
              <View key={word} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {i ? <View style={styles.dot} /> : null}
                <T size={12} weight="medium" color="#C6D8D0">{word}</T>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  content: { padding: 24, paddingTop: 36, flexGrow: 1 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headline: { lineHeight: 37, letterSpacing: -0.8, marginTop: 40, marginBottom: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#CFE6D8', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  start: { backgroundColor: colors.lime, borderRadius: radius.md, minHeight: 56, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lime },
}));
