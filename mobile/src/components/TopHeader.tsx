import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, radius, themed } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { useSession } from '../lib/session';
import { useRefresh } from '../lib/useRefresh';
import { Ionicons, T, type IconName } from './ui';
import { useCommandPalette } from './CommandPalette';
import { LangSwitch } from './LangSwitch';
import { t } from '../lib/i18n';

// Шапка из макета заказчика: тёмно-зелёная, со скруглением снизу, логотип ToiTime.
export function Brand({ size = 23 }: { size?: number }) {
  return (
    <T weight="extrabold" size={size} color="#FFFFFF" style={{ letterSpacing: -0.8 }}>
      Toi<T weight="extrabold" size={size} color="#D8F27B">Time</T>
    </T>
  );
}

function HeaderIcon({ name, label, onPress, badge }: { name: IconName; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable style={({ pressed }) => [styles.icon, pressed && { backgroundColor: '#FFFFFF33', transform: [{ scale: 0.94 }] }]}
      onPress={onPress} accessibilityLabel={label} accessibilityRole="button" hitSlop={4}>
      <Ionicons name={name} size={17} color="#FFFFFF" />
      {badge ? <View style={styles.badge}><T weight="bold" size={9} color="#123C32" style={{ lineHeight: 12 }}>{badge > 9 ? '9+' : badge}</T></View> : null}
    </Pressable>
  );
}

export function TopHeader({ title: titleProp, subtitle: subtitleProp, children }: {
  title?: string; subtitle?: string; children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { mode, toggle } = useTheme();
  const title = titleProp ?? t('Той начинается\nс хорошей организации.');
  const subtitle = subtitleProp ?? t('Приглашения, ответы гостей и напоминания — в одном месте.');
  const { config } = useSession();
  const palette = useCommandPalette();
  const demo = config?.testMode.whatsapp || config?.testMode.payments;
  const { data: notes } = useRefresh(api.notifications, 15000);
  const unread = (notes ?? []).filter((n) => !n.read).length;
  const tag = <View style={styles.tag}><T weight="semibold" size={11} color="#E3EEE8">{demo ? t('БЕЗ РЕКЛАМЫ · ДЕМО') : t('БЕЗ РЕКЛАМЫ')}</T></View>;
  return (
    <View style={[styles.top, { paddingTop: insets.top + 20 }]}>
      <View style={styles.line}>
        <Brand />
        <View style={styles.right}>
          <HeaderIcon name="search" label={t('Поиск (Ctrl+K)')} onPress={palette.open} />
          <HeaderIcon name={mode === 'dark' ? 'sun' : 'moon'} label={mode === 'dark' ? t('Светлая тема') : t('Тёмная тема')} onPress={toggle} />
          <HeaderIcon name="notifications-outline" label={t('Уведомления')} onPress={() => router.push('/notifications')} badge={unread} />
          <HeaderIcon name="settings-outline" label={t('Настройки')} onPress={() => router.push('/settings')} />
        </View>
      </View>
      <View style={styles.tagRow}>{tag}<LangSwitch /></View>
      <T weight="extrabold" size={25} color="#FFFFFF" style={[styles.title, { marginTop: 14 }]}>{title}</T>
      <T size={13} color={colors.headerSub}>{subtitle}</T>
      {children}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  top: { backgroundColor: colors.header, paddingHorizontal: 19, paddingBottom: 25, borderBottomLeftRadius: radius.xl + 1, borderBottomRightRadius: radius.xl + 1 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16 },
  tag: { borderWidth: 1, borderColor: '#FFFFFF44', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  icon: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#D8F27B', alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 29, marginTop: 24, marginBottom: 8, maxWidth: 340, letterSpacing: -0.7 },
}));
