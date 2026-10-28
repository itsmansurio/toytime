import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avatarColors, colors, font, initials, radius, shadow } from '../lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

type Weight = keyof typeof font;

export function T({ weight = 'regular', size = 15, color = colors.text, style, ...props }: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <Text {...props} style={[{ fontFamily: font[weight], fontSize: size, color, lineHeight: Math.round(size * 1.38) }, style]} />;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, icon, size = 'lg' }: {
  title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'light' | 'lime'; disabled?: boolean; loading?: boolean;
  style?: ViewStyle; icon?: IconName; size?: 'lg' | 'md';
}) {
  const fg = { primary: '#fff', outline: colors.green, danger: colors.red, ghost: colors.green, light: colors.green, lime: colors.green }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button, size === 'md' && styles.buttonMd, styles[variant],
        (disabled || loading) && styles.disabled, pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={size === 'md' ? 18 : 20} color={fg} /> : null}
          <T weight="bold" size={size === 'md' ? 15 : 16} color={fg}>{title}</T>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode | string }) {
  return (
    <View style={styles.sectionRow}>
      <T weight="extrabold" size={18} style={{ letterSpacing: -0.3 }}>{children}</T>
      {typeof right === 'string' ? <T size={12} color={colors.muted}>{right}</T> : right}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <T weight="bold" size={12} color={colors.muted} style={{ marginBottom: 6 }}>{children}</T>;
}

export function Field({ label, counter, icon, ...props }: TextInputProps & { label?: string; counter?: boolean; icon?: IconName }) {
  return (
    <View style={{ marginBottom: 18 }}>
      {label ? <Label>{label}</Label> : null}
      <View style={[styles.inputWrap, props.multiline && { alignItems: 'flex-start', paddingTop: 14 }]}>
        {icon ? <Ionicons name={icon} size={19} color={colors.green} style={{ marginRight: 10, marginTop: props.multiline ? 1 : 0 }} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          style={[styles.input, props.multiline && { minHeight: 92, textAlignVertical: 'top', paddingTop: 0 }, props.style as TextStyle]}
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
      <Ionicons name="information-circle-outline" size={18} color="#53663A" />
      <T size={12} color="#53663A" style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function IconTile({ name, color = colors.green, bg = colors.greenLight, size = 44 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const [bg, fg] = avatarColors(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.35, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <T weight="extrabold" size={size * 0.36} color={fg}>{initials(name)}</T>
    </View>
  );
}

export function Pill({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
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
      {yes ? <View style={{ flex: yes, backgroundColor: colors.green }} /> : null}
      {no ? <View style={{ flex: no, backgroundColor: colors.red }} /> : null}
      {pending ? <View style={{ flex: pending, backgroundColor: '#D5DDD8' }} /> : null}
    </View>
  );
}

export function EmptyState({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCircle}>
        <View style={styles.emptyInner}><Ionicons name={icon} size={40} color={colors.green} /></View>
      </View>
      <T weight="bold" size={20} style={{ marginTop: 20, textAlign: 'center' }}>{title}</T>
      <T size={15} color={colors.muted} style={{ textAlign: 'center', marginTop: 8 }}>{text}</T>
      {children}
    </View>
  );
}

export function Row({ icon, title, value, onPress, danger, last }: { icon: IconName; title: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.greenSoft }]}>
      <IconTile name={icon} size={36} color={danger ? colors.red : colors.green} bg={danger ? colors.redLight : colors.greenLight} />
      <T weight="semibold" size={15} color={danger ? colors.red : colors.text} style={{ flex: 1 }}>{title}</T>
      {value ? <T size={14} color={colors.muted}>{value}</T> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  buttonMd: { minHeight: 46, paddingVertical: 11, paddingHorizontal: 16 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.green },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: '#FFF0EE' },
  ghost: { backgroundColor: 'transparent' },
  light: { backgroundColor: colors.greenSoft },
  lime: { backgroundColor: colors.lime },
  disabled: { opacity: 0.45 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8, marginHorizontal: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE4DD', borderRadius: radius.sm, paddingHorizontal: 14, backgroundColor: '#fff' },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text, fontFamily: font.medium, outlineStyle: 'none' } as unknown as TextStyle,
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.redLight, borderRadius: radius.sm, padding: 12, marginVertical: 10 },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.goldLight, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  bar: { flexDirection: 'row', borderRadius: 99, overflow: 'hidden', backgroundColor: '#E6ECE8' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  emptyInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});

// ---------- Блоки из макета заказчика ----------

export function HeaderRow({ onBack, backLabel = 'Назад', right }: { onBack: () => void; backLabel?: string; right?: string }) {
  return (
    <View style={mock.headerRow}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="arrow-back" size={17} color={colors.green} />
        <T weight="extrabold" size={15} color={colors.green}>{backLabel}</T>
      </Pressable>
      {right ? <T size={12} color={colors.muted}>{right}</T> : null}
    </View>
  );
}

export function Notice({ children, icon = 'information-circle-outline' }: { children: ReactNode; icon?: IconName }) {
  return (
    <View style={mock.notice}>
      <Ionicons name={icon} size={16} color="#53663A" />
      <T size={12} color="#53663A" style={{ flex: 1 }}>{children}</T>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />;
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[mock.checkbox, checked && mock.checkboxOn]}>
      {checked ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
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

const mock = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 5 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.goldLight, borderRadius: 14, padding: 12, marginVertical: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#A9B5AD', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 7 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 9 },
});
