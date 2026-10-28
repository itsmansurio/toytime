import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../lib/theme';
import { Ionicons, T, type IconName } from './ui';

const TILES: { key: 'yes' | 'no' | 'pending'; label: string; icon: IconName; color: string; bg: string }[] = [
  { key: 'yes', label: 'Придут', icon: 'checkmark-circle', color: colors.green, bg: colors.greenLight },
  { key: 'no', label: 'Не придут', icon: 'close-circle', color: colors.red, bg: colors.redLight },
  { key: 'pending', label: 'Не ответили', icon: 'time', color: colors.grey, bg: colors.greyLight },
];

export function StatTiles({ yes, no, pending }: { yes: number; no: number; pending: number }) {
  const values = { yes, no, pending };
  return (
    <View style={styles.row}>
      {TILES.map((t) => (
        <View key={t.key} style={[styles.tile, { backgroundColor: t.bg }]}>
          <Ionicons name={t.icon} size={20} color={t.color} />
          <T weight="extrabold" size={28} color={t.color} style={{ marginTop: 6 }}>{values[t.key]}</T>
          <T weight="semibold" size={12} color={colors.textSoft}>{t.label}</T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 12 },
});
