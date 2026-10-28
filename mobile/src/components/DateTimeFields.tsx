import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, radius } from '../lib/theme';
import { formatDate, toIsoDate, toTime } from '../lib/format';
import { Ionicons, T } from './ui';

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
        <Pressable style={[styles.box, { flex: 1 }, iosMode === 'date' && styles.active]} onPress={() => open('date')} accessibilityRole="button">
          <Ionicons name="calendar-outline" size={19} color={colors.green} />
          <T weight="semibold" size={15}>{formatDate(toIsoDate(value))}</T>
        </Pressable>
        <Pressable style={[styles.box, { flex: 1 }, iosMode === 'time' && styles.active]} onPress={() => open('time')} accessibilityRole="button">
          <Ionicons name="time-outline" size={19} color={colors.green} />
          <T weight="semibold" size={15}>{toTime(value)}</T>
        </Pressable>
      </View>
      {iosMode ? (
        <DateTimePicker
          value={value}
          mode={iosMode}
          display={iosMode === 'date' ? 'inline' : 'spinner'}
          locale="ru-RU"
          accentColor={colors.green}
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
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#DCE4DD', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#fff' },
  active: { borderColor: colors.green, backgroundColor: colors.greenSoft },
});
