import { Pressable, StyleSheet, View } from 'react-native';
import { colors, themed } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { LANGS } from '../lib/i18n';
import { T } from './ui';

// Переключатель языка RU / KZ / EN для тёмно-зелёной шапки.
export function LangSwitch() {
  const { lang, setLang } = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {LANGS.map((l) => {
        const on = lang === l.value;
        return (
          <Pressable key={l.value} onPress={() => setLang(l.value)} style={[styles.item, on && styles.on]} hitSlop={4}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={l.label}>
            <T weight="bold" size={12} color={on ? colors.onLime : '#E3EEE8'}>{l.short}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 2, borderWidth: 1, borderColor: '#FFFFFF44', borderRadius: 20, padding: 3 },
  item: { minWidth: 36, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  on: { backgroundColor: colors.lime },
}));
