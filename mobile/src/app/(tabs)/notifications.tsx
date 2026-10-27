import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { useRefresh } from '../../lib/useRefresh';
import { colors } from '../../lib/theme';
import { Card, ErrorText } from '../../components/ui';

export default function Notifications() {
  const { data, error, loading } = useRefresh(api.notifications);
  useFocusEffect(useCallback(() => () => { api.markNotificationsRead().catch(() => {}); }, []));
  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={data ?? []}
      keyExtractor={(n) => String(n.id)}
      ListHeaderComponent={<ErrorText>{error}</ErrorText>}
      ListEmptyComponent={loading ? undefined : <Text style={styles.empty}>Здесь появятся ответы гостей и статусы рассылки.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => item.eventId && router.push(`/event/${item.eventId}`)}>
          <Card style={!item.read ? { borderLeftWidth: 4, borderLeftColor: colors.green } : undefined}>
            <Text style={styles.text}>{item.text}</Text>
            <View><Text style={styles.time}>{new Date(item.createdAt).toLocaleString('ru-RU')}</Text></View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 15, color: colors.text, lineHeight: 21 },
  time: { fontSize: 12, color: colors.muted, marginTop: 6 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 60, paddingHorizontal: 24, fontSize: 15 },
});
