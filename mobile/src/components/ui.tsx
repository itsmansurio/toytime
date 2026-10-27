import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const v = styles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, v, (disabled || loading) && styles.disabled, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.green} /> : (
        <Text style={[styles.buttonText, variant !== 'primary' && { color: variant === 'danger' ? colors.red : colors.green }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({ label, counter, ...props }: TextInputProps & { label?: string; counter?: boolean }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} />
      {counter && props.maxLength ? <Text style={styles.counter}>{(props.value ?? '').length}/{props.maxLength}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function TestBanner({ children }: { children: ReactNode }) {
  return <View style={styles.banner}><Text style={styles.bannerText}>{children}</Text></View>;
}

export function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  primary: { backgroundColor: colors.green },
  outline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.green },
  danger: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.red },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.text, backgroundColor: '#fff' },
  counter: { alignSelf: 'flex-end', color: colors.muted, fontSize: 12, marginTop: 4 },
  error: { color: colors.red, marginVertical: 8, fontSize: 14 },
  banner: { backgroundColor: colors.yellow, borderRadius: 12, padding: 12, marginBottom: 12 },
  bannerText: { color: '#6B4E00', fontSize: 13, lineHeight: 18 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
