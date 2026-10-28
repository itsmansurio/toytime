import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../lib/api';
import { normalizePhone } from '../../../lib/phone';
import { colors } from '../../../lib/theme';
import { Button, ErrorText, Field, IconTile, Ionicons, T } from '../../../components/ui';

export default function ManualGuest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const add = async (closeAfter: boolean) => {
    const normalized = normalizePhone(phone);
    if (!normalized) { setError('Введите номер в формате +7 7XX XXX XX XX'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.addGuests(id, [{ name: name.trim() || normalized, phone: normalized }]);
      if (res.rejected.length) { setError(res.rejected[0].reason); return; }
      if (closeAfter) { router.back(); return; }
      setAdded([...added, name.trim() || normalized]);
      setName('');
      setPhone('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <IconTile name="person-add" size={64} />
        <T size={14} color={colors.muted} style={{ textAlign: 'center', marginTop: 10 }}>Приглашение придёт гостю в WhatsApp на этот номер</T>
      </View>
      <Field label="Имя" placeholder="Алия Абдрахманова" value={name} onChangeText={setName} maxLength={100} autoFocus icon="person-outline" />
      <Field label="Номер WhatsApp" placeholder="+7 701 234 56 78" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="logo-whatsapp" />
      <ErrorText>{error}</ErrorText>
      <Button title="Добавить" icon="checkmark" onPress={() => add(true)} disabled={!phone} loading={loading} />
      <Button title="Добавить и ввести ещё" variant="ghost" icon="add" onPress={() => add(false)} disabled={!phone || loading} style={{ marginTop: 6 }} />
      {added.length ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.green} />
          <T size={13} color={colors.green}>Добавлены: {added.join(', ')}</T>
        </View>
      ) : null}
    </ScrollView>
  );
}
