import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { T } from './ui';

// Тёмно-зелёная шапка со скруглением снизу — как в макете заказчика.
export function Brand({ size = 23 }: { size?: number }) {
  return (
    <T weight="extrabold" size={size} color="#fff" style={{ letterSpacing: -0.8 }}>
      Toy<T weight="extrabold" size={size} color={colors.lime}>Time</T>
    </T>
  );
}

export function TopHeader({ title, subtitle, tag = 'БЕЗ РЕКЛАМЫ', right, children }: {
  title?: string; subtitle?: string; tag?: string | null; right?: ReactNode; children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.top, { paddingTop: insets.top + 18 }]}>
      <View style={styles.line}>
        <Brand />
        {right ?? (tag ? <View style={styles.tag}><T weight="semibold" size={11} color="#E3EEE8">{tag}</T></View> : null)}
      </View>
      {title ? <T weight="extrabold" size={25} color="#fff" style={styles.title}>{title}</T> : null}
      {subtitle ? <T size={13} color="#C6D8D0">{subtitle}</T> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.green, paddingHorizontal: 19, paddingBottom: 25, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { borderWidth: 1, borderColor: '#FFFFFF44', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  title: { lineHeight: 29, marginTop: 22, marginBottom: 8, maxWidth: 340, letterSpacing: -0.6 },
});
