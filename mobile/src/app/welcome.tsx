import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '../lib/session';
import { API_URL } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { ErrorText, Ionicons, T, type IconName } from '../components/ui';

const FEATURES: [IconName, string, string][] = [
  ['create-outline', 'Мероприятие за 2 минуты', 'Название, дата, место и текст приглашения'],
  ['people-outline', 'Гости из контактов', 'Отметьте нужных людей в телефонной книге'],
  ['logo-whatsapp', 'Приглашения в WhatsApp', 'Напомним тем, кто ещё не ответил'],
];

export default function Welcome() {
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
      setError(e instanceof Error ? e.message : 'Ошибка');
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#13704A', colors.green, colors.greenDark]} locations={[0, 0.45, 1]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <View style={[styles.glow, { top: -120, right: -80 }]} />
      <View style={[styles.glow, { bottom: 80, left: -140, opacity: 0.06 }]} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logoWrap}>
            <View style={styles.logoRing}>
              <View style={styles.logo}><Ionicons name="notifications" size={40} color={colors.green} /></View>
            </View>
          </View>
          <T weight="extrabold" size={42} color="#fff" style={styles.center}>ToyTime</T>
          <T weight="medium" size={17} color="#CFE6D8" style={[styles.center, { marginTop: 4 }]}>Ваш той — в надёжных руках</T>
          <View style={styles.divider}>
            <View style={styles.line} /><Ionicons name="sparkles" size={14} color={colors.gold} /><View style={styles.line} />
          </View>

          <View style={{ gap: 12 }}>
            {FEATURES.map(([icon, title, text]) => (
              <View key={title} style={styles.feature}>
                <View style={styles.featureIcon}><Ionicons name={icon} size={22} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={15} color="#fff">{title}</T>
                  <T size={13} color="#B9D6C5">{text}</T>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />
          <Pressable style={styles.consent} onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>
              {consent ? <Ionicons name="checkmark" size={16} color={colors.green} /> : null}
            </View>
            <T size={13} color="#CFE6D8" style={{ flex: 1 }}>
              Согласен(на) на обработку персональных данных — моих и моих гостей — для отправки приглашений.{' '}
              <T size={13} weight="semibold" color="#fff" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${API_URL}/privacy`)}>
                Политика конфиденциальности
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
            <T weight="bold" size={17} color={colors.green}>{loading ? 'Подождите…' : 'Начать'}</T>
            {!loading ? <Ionicons name="arrow-forward" size={20} color={colors.green} /> : null}
          </Pressable>
          <View style={styles.footer}>
            {['Без рекламы', 'Просто', 'Удобно'].map((t, i) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {i ? <View style={styles.dot} /> : null}
                <T size={12} weight="medium" color="#9CC2AE">{t}</T>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 36, flexGrow: 1 },
  center: { textAlign: 'center' },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: '#fff', opacity: 0.07 },
  logoWrap: { alignItems: 'center', marginBottom: 18 },
  logoRing: { padding: 8, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  logo: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.gold },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 26, paddingHorizontal: 40 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(201,162,75,0.5)' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#CFE6D8', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: '#fff', borderColor: '#fff' },
  start: { backgroundColor: '#fff', borderRadius: radius.md, minHeight: 58, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold },
});
