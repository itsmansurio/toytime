import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { Icon as Ionicons, type IconName } from './Icon';
import { colors, font, initials, radius, shadow, themed } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { t } from '../lib/i18n';

export type { IconName };
export { Ionicons };

type Weight = keyof typeof font;

export function T({ weight = 'regular', size = 15, color, style, ...props }: TextProps & { weight?: Weight; size?: number; color?: string }) {
  useTheme();
  return <Text {...props} style={[{ fontFamily: font[weight], fontSize: size, color: color ?? colors.text, lineHeight: Math.round(size * 1.4) }, style]} />;
}

// Нажатие с лёгкой пружинкой — микро-анимация для кнопок и карточек.
export function PressScale({ children, onPress, disabled, style, accessibilityLabel, accessibilityRole = 'button' }: {
  children: ReactNode; onPress?: () => void; disabled?: boolean; style?: ViewStyle | (ViewStyle | false | undefined)[];
  accessibilityLabel?: string; accessibilityRole?: 'button' | 'checkbox' | 'link';
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(0.97)} onPressOut={() => to(1)}
      accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[style as ViewStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

type Variant = 'primary' | 'outline' | 'danger' | 'ghost' | 'light' | 'lime';

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, icon, size = 'lg' }: {
  title: string; onPress: () => void; variant?: Variant; disabled?: boolean; loading?: boolean;
  style?: ViewStyle; icon?: IconName; size?: 'lg' | 'md';
}) {
  useTheme();
  const fg = { primary: colors.onPrimary, outline: colors.green, danger: colors.red, ghost: colors.green, light: colors.green, lime: colors.onLime }[variant];
  return (
    <PressScale onPress={onPress} disabled={disabled || loading}
      style={[styles.button, size === 'md' && styles.buttonMd, styles[variant], (disabled || loading) && styles.disabled, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={size === 'md' ? 17 : 19} color={fg} strokeWidth={2.4} /> : null}
          <T weight="bold" size={size === 'md' ? 15 : 16} color={fg}>{title}</T>
        </View>
      )}
    </PressScale>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  useTheme();
  return <FadeIn style={[styles.card, ...(Array.isArray(style) ? style : [style])] as ViewStyle[]}>{children}</FadeIn>;
}

// Плавное появление блока при открытии экрана.
export function FadeIn({ children, style, delay = 0 }: { children: ReactNode; style?: ViewStyle | (ViewStyle | undefined)[]; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style as ViewStyle, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Скелетон: пульсирующая заглушка, пока данные загружаются.
export function Skeleton({ width = '100%', height = 14, radius: r = 8, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: ViewStyle }) {
  useTheme();
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.skeleton, opacity: v }, style]} />;
}

export function SkeletonCard({ lines = 3, tall }: { lines?: number; tall?: boolean }) {
  return (
    <View style={styles.card}>
      <Skeleton width="60%" height={20} />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} width={i % 2 ? '45%' : '80%'} style={{ marginTop: 12 }} />)}
      {tall ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>{[0, 1, 2].map((i) => <Skeleton key={i} width="31%" height={60} radius={14} />)}</View> : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode | string }) {
  return (
    <View style={styles.sectionRow}>
      <T weight="extrabold" size={18} style={{ letterSpacing: -0.4 }}>{children}</T>
      {typeof right === 'string' ? <T size={12} weight="medium" color={colors.muted}>{right}</T> : right}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <T weight="semibold" size={12} color={colors.muted} style={{ marginBottom: 6 }}>{children}</T>;
}

export function Field({ label, counter, icon, ...props }: TextInputProps & { label?: string; counter?: boolean; icon?: IconName }) {
  useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Label>{label}</Label> : null}
      <View style={[styles.inputWrap, props.multiline && { alignItems: 'flex-start', paddingTop: 12 }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={{ marginRight: 10, marginTop: props.multiline ? 1 : 0 }} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          style={[styles.input, props.multiline && { minHeight: 84, textAlignVertical: 'top', paddingTop: 0 }, props.style as TextStyle]}
        />
      </View>
      {counter && props.maxLength ? <T size={12} color={colors.muted} style={{ alignSelf: 'flex-end', marginTop: 4 }}>{(props.value ?? '').length}/{props.maxLength}</T> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={18} color={colors.red} />
      <T size={14} color={colors.red} style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function TestBanner({ children }: { children: ReactNode }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color={colors.notice} />
      <T size={12} color={colors.notice} style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function IconTile({ name, color, bg, size = 44 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg ?? colors.greenLight, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.48} color={color ?? colors.green} />
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.35, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' }}>
      <T weight="extrabold" size={size * 0.36} color={colors.green}>{initials(name)}</T>
    </View>
  );
}

export function Pill({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} strokeWidth={2.6} /> : null}
      <T weight="bold" size={11} color={color}>{label}</T>
    </View>
  );
}

// Шкала ответов: придут / не придут / не ответили.
export function ResponseBar({ yes, no, pending, height = 8 }: { yes: number; no: number; pending: number; height?: number }) {
  const total = yes + no + pending;
  if (!total) return <View style={[styles.bar, { height }]} />;
  return (
    <View style={[styles.bar, { height }]}>
      {yes ? <View style={{ flex: yes, backgroundColor: colors.yes }} /> : null}
      {no ? <View style={{ flex: no, backgroundColor: colors.red }} /> : null}
      {pending ? <View style={{ flex: pending, backgroundColor: colors.inputBorder }} /> : null}
    </View>
  );
}

// Понятное пустое состояние: иконка, объяснение и кнопка действия.
export function EmptyState({ icon, title, text, action, onAction, children, compact }: {
  icon: IconName; title: string; text: string; action?: string; onAction?: () => void; children?: ReactNode; compact?: boolean;
}) {
  return (
    <FadeIn style={[styles.empty, compact ? { paddingTop: 20, paddingBottom: 8 } : undefined]}>
      <View style={styles.emptyCircle}><Ionicons name={icon} size={30} color={colors.green} /></View>
      <T weight="extrabold" size={17} style={{ marginTop: 14, textAlign: 'center' }}>{title}</T>
      <T size={14} color={colors.muted} style={{ textAlign: 'center', marginTop: 6 }}>{text}</T>
      {action && onAction ? <Button title={action} size="md" icon="add" onPress={onAction} style={{ marginTop: 16, alignSelf: 'stretch' }} /> : null}
      {children}
    </FadeIn>
  );
}

export function Row({ icon, title, value, onPress, danger, last, right }: { icon: IconName; title: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean; right?: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.greenSoft }]}>
      <IconTile name={icon} size={36} color={danger ? colors.red : colors.green} bg={danger ? colors.redLight : colors.greenLight} />
      <T weight="semibold" size={15} color={danger ? colors.red : colors.text} style={{ flex: 1 }}>{title}</T>
      {value ? <T size={14} color={colors.muted}>{value}</T> : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  button: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonMd: { minHeight: 48, paddingVertical: 11, paddingHorizontal: 16 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.redLight },
  ghost: { backgroundColor: 'transparent' },
  light: { backgroundColor: colors.greenSoft },
  lime: { backgroundColor: colors.lime },
  disabled: { opacity: 0.45 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8, marginHorizontal: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: colors.card },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text, fontFamily: font.medium, outlineStyle: 'none' } as unknown as TextStyle,
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.redLight, borderRadius: radius.sm, padding: 12, marginVertical: 10 },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.goldLight, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  bar: { flexDirection: 'row', borderRadius: 99, overflow: 'hidden', backgroundColor: colors.skeleton },
  empty: { alignItems: 'center', paddingTop: 36, paddingBottom: 16, paddingHorizontal: 20 },
  emptyCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
}));

// ---------- Блоки из макета заказчика ----------

export function HeaderRow({ onBack, backLabel, right }: { onBack: () => void; backLabel?: string; right?: string }) {
  return (
    <View style={mock.headerRow}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="arrow-back" size={17} color={colors.green} strokeWidth={2.6} />
        <T weight="extrabold" size={15} color={colors.green}>{backLabel ?? t('Назад')}</T>
      </Pressable>
      {right ? <T size={12} color={colors.muted}>{right}</T> : null}
    </View>
  );
}

export function Notice({ children, icon = 'information-circle-outline' }: { children: ReactNode; icon?: IconName }) {
  return (
    <View style={mock.notice}>
      <Ionicons name={icon} size={16} color={colors.notice} />
      <T size={12} color={colors.notice} style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />;
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[mock.checkbox, checked && mock.checkboxOn]}>
      {checked ? <Ionicons name="checkmark" size={13} color={colors.onPrimary} strokeWidth={3} /> : null}
    </View>
  );
}

export function CheckLine({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={mock.checkLine} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <Checkbox checked={checked} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <T size={13}>{children}</T> : children}</View>
    </Pressable>
  );
}

export function Stats({ items }: { items: [number, string][] }) {
  return (
    <View style={mock.stats}>
      {items.map(([value, label]) => (
        <View key={label} style={mock.stat}>
          <T weight="extrabold" size={22} style={{ letterSpacing: -0.5 }}>{value}</T>
          <T size={11} color={colors.muted}>{label}</T>
        </View>
      ))}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <T size={12} color={colors.muted} style={[{ lineHeight: 18 }, style]}>{children}</T>;
}

const mock = themed(() => StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 5 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.goldLight, borderRadius: 14, padding: 12, marginVertical: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.muted, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 7 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 9 },
}));
