import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../lib/theme';
import { Ionicons, T, type IconName } from './ui';

const TILES: { key: 'yes' | 'no' | 'pending'; label: string; icon: IconName; color: string; bg: string }[] = [
  { key: 'yes', label: 'Придут', icon: 'checkmark-circle', color: colors.yes, bg: colors.bg },
  { key: 'no', label: 'Не смогут', icon: 'close-circle', color: colors.red, bg: colors.bg },
  { key: 'pending', label: 'Не ответили', icon: 'time', color: colors.amber, bg: colors.bg },
];

export function StatTiles({ yes, no, pending }: { yes: number; no: number; pending: number }) {
  const values = { yes, no, pending };
  return (
    <View style={styles.row}>
      {TILES.map((t) => (
        <View key={t.key} style={[styles.tile, { backgroundColor: t.bg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T weight="extrabold" size={22} style={{ letterSpacing: -0.5 }}>{values[t.key]}</T>
            <Ionicons name={t.icon} size={16} color={t.color} />
          </View>
          <T size={11} color={colors.muted}>{t.label}</T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 10 },
});
