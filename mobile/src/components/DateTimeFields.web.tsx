import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';
import { toIsoDate, toTime } from '../lib/format';

// Веб-версия только для предпросмотра в браузере.
export function DateTimeFields({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const style = { border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14, fontSize: 16, flex: 1, fontFamily: 'inherit' };
  return (
    <View style={styles.row}>
      {createElement('input', {
        type: 'date', value: toIsoDate(value), style: { ...style, flex: 1.4 },
        onChange: (e: { target: { value: string } }) => {
          const [y, m, d] = e.target.value.split('-').map(Number);
          if (y) { const n = new Date(value); n.setFullYear(y, m - 1, d); onChange(n); }
        },
      })}
      {createElement('input', {
        type: 'time', value: toTime(value), style,
        onChange: (e: { target: { value: string } }) => {
          const [h, min] = e.target.value.split(':').map(Number);
          if (!Number.isNaN(h)) { const n = new Date(value); n.setHours(h, min); onChange(n); }
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 10 } });
