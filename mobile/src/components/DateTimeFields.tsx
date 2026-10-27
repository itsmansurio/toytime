import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../lib/theme';
import { formatDate, toIsoDate, toTime } from '../lib/format';

// Дата и время мероприятия: системные пикеры iOS и Android.
export function DateTimeFields({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [iosMode, setIosMode] = useState<'date' | 'time' | null>(null);

  const open = (mode: 'date' | 'time') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value, mode, is24Hour: true, minimumDate: mode === 'date' ? new Date() : undefined,
        onChange: (e: DateTimePickerEvent, d?: Date) => { if (e.type === 'set' && d) onChange(d); },
      });
    } else {
      setIosMode(iosMode === mode ? null : mode);
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <Pressable style={[styles.box, { flex: 1.4 }]} onPress={() => open('date')} accessibilityRole="button">
          <Text style={styles.text}>📅  {formatDate(toIsoDate(value))}</Text>
        </Pressable>
        <Pressable style={[styles.box, { flex: 1 }]} onPress={() => open('time')} accessibilityRole="button">
          <Text style={styles.text}>🕖  {toTime(value)}</Text>
        </Pressable>
      </View>
      {iosMode ? (
        <DateTimePicker
          value={value}
          mode={iosMode}
          display={iosMode === 'date' ? 'inline' : 'spinner'}
          locale="ru-RU"
          minimumDate={iosMode === 'date' ? new Date() : undefined}
          minuteInterval={5}
          onChange={(_, d) => d && onChange(d)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 15, backgroundColor: '#fff' },
  text: { fontSize: 16, color: colors.text },
});
