import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, font, radius } from '../lib/theme';
import { toIsoDate, toTime } from '../lib/format';
import { Ionicons } from './ui';

// Веб-версия (демо в браузере): нативные поля даты и времени браузера.
export function DateTimeFields({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const input = { border: 'none', outline: 'none', fontSize: 14, fontFamily: font.semibold, color: colors.text, background: 'transparent', flex: 1, minWidth: 0 };
  return (
    <View style={styles.row}>
      <View style={[styles.box, { flex: 1 }]}>
        <Ionicons name="calendar-outline" size={19} color={colors.green} />
        {createElement('input', {
          lang: 'ru', type: 'date', value: toIsoDate(value), style: input, min: toIsoDate(new Date()),
          onChange: (e: { target: { value: string } }) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            if (y) { const n = new Date(value); n.setFullYear(y, m - 1, d); onChange(n); }
          },
        })}
      </View>
      <View style={[styles.box, { flex: 1 }]}>
        <Ionicons name="time-outline" size={19} color={colors.green} />
        {createElement('input', {
          lang: 'ru', type: 'time', value: toTime(value), style: input,
          onChange: (e: { target: { value: string } }) => {
            const [h, min] = e.target.value.split(':').map(Number);
            if (!Number.isNaN(h)) { const n = new Date(value); n.setHours(h, min); onChange(n); }
          },
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#fff' },
});
