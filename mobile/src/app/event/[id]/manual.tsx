import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../lib/api';
import { normalizePhone } from '../../../lib/phone';
import { colors } from '../../../lib/theme';
import { Button, ErrorText, Field } from '../../../components/ui';

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
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Field label="Имя" placeholder="Алия" value={name} onChangeText={setName} maxLength={100} autoFocus />
      <Field label="Номер WhatsApp" placeholder="+7 701 234 56 78" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <ErrorText>{error}</ErrorText>
      <Button title="Добавить" onPress={() => add(true)} disabled={!phone} loading={loading} />
      <Button title="Добавить и ввести ещё" variant="ghost" onPress={() => add(false)} disabled={!phone || loading} />
      {added.length ? <Text style={{ color: colors.muted, marginTop: 8 }}>Добавлены: {added.join(', ')}</Text> : null}
    </ScrollView>
  );
}
