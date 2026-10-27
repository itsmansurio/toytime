import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../lib/session';
import { API_URL } from '../lib/api';
import { colors } from '../lib/theme';
import { ErrorText } from '../components/ui';

const FEATURES = [
  ['✍️', 'Создайте мероприятие за 2 минуты'],
  ['👥', 'Добавьте гостей из контактов'],
  ['💬', 'Мы отправим приглашения и напоминания в WhatsApp'],
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
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.bell}>🛎️</Text>
        <Text style={styles.logo}>ToyTime</Text>
        <Text style={styles.tagline}>Ваш той — в надёжных руках</Text>
        <View style={{ marginTop: 32, gap: 18 }}>
          {FEATURES.map(([icon, text]) => (
            <View key={text} style={styles.feature}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.consent} onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
          <View style={[styles.checkbox, consent && styles.checkboxOn]}>{consent ? <Text style={styles.check}>✓</Text> : null}</View>
          <Text style={styles.consentText}>
            Я согласен(на) на обработку персональных данных моих гостей и моих данных для отправки приглашений.{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(`${API_URL}/privacy`)}>Политика конфиденциальности</Text>
          </Text>
        </Pressable>
        <ErrorText>{error}</ErrorText>
        <Pressable
          style={[styles.start, (!consent || loading) && { opacity: 0.5 }]}
          disabled={!consent || loading}
          onPress={start}
          accessibilityRole="button"
        >
          <Text style={styles.startText}>{loading ? 'Подождите…' : 'Начать'}</Text>
        </Pressable>
        <Text style={styles.footer}>Без рекламы  ·  Просто  ·  Удобно</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.green },
  content: { padding: 28, paddingTop: 48, flexGrow: 1 },
  bell: { fontSize: 56, textAlign: 'center' },
  logo: { color: '#fff', fontSize: 44, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  tagline: { color: '#E3F0E8', fontSize: 18, textAlign: 'center', marginTop: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { fontSize: 22, width: 44, height: 44, textAlign: 'center', lineHeight: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  featureText: { color: '#fff', fontSize: 16, flex: 1 },
  consent: { flexDirection: 'row', gap: 12, marginTop: 36, alignItems: 'flex-start' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: '#fff' },
  check: { color: colors.green, fontWeight: '800' },
  consentText: { color: '#E3F0E8', fontSize: 14, lineHeight: 20, flex: 1 },
  link: { color: '#fff', textDecorationLine: 'underline' },
  start: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 20 },
  startText: { color: colors.green, fontSize: 17, fontWeight: '700' },
  footer: { color: '#B9D6C5', textAlign: 'center', marginTop: 20, fontSize: 13 },
});
