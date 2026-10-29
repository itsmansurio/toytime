import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api, type EventItem, type Guest } from '../lib/api';
import { pickCurrent, useCurrentId } from '../lib/current';
import { formatDate } from '../lib/format';
import { formatPhone } from '../lib/phone';
import { colors, font, radius, themed } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { useSession } from '../lib/session';
import { Ionicons, T, type IconName } from './ui';
import { t } from '../lib/i18n';

const GROUP_TITLE: Record<string, () => string> = { actions: () => t('Действия'), events: () => t('Мероприятия'), guests: () => t('Гости') };
type Item = { key: string; icon: IconName; title: string; hint?: string; group: string; run: () => void };
const PaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(PaletteContext);

// Быстрый поиск и команды: Cmd+K / Ctrl+K на компьютере, кнопка-лупа в шапке на телефоне.
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const { signedIn } = useSession();

  useEffect(() => {
    if (Platform.OS !== 'web' || !signedIn) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setVisible((v) => !v); }
      if (e.key === 'Escape') setVisible(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signedIn]);

  return (
    <PaletteContext.Provider value={{ open }}>
      {children}
      {visible ? <Palette onClose={() => setVisible(false)} /> : null}
    </PaletteContext.Provider>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { mode, toggle, lang } = useTheme();
  const { currentId, setCurrentId } = useCurrentId();
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);

  useEffect(() => {
    api.events().then((list) => {
      setEvents(list);
      const cur = pickCurrent(list, currentId);
      if (cur) api.guests(cur.id).then(setGuests).catch(() => {});
    }).catch(() => {});
  }, [currentId]);

  const go = (fn: () => void) => () => { onClose(); fn(); };
  const items: Item[] = useMemo(() => [
    { key: 'new', icon: 'add', title: t('Создать мероприятие'), group: 'actions', run: go(() => router.navigate({ pathname: '/event', params: { mode: 'new' } })) },
    { key: 'guest', icon: 'user-plus', title: t('Добавить гостя'), group: 'actions', run: go(() => router.navigate('/guests')) },
    { key: 'send', icon: 'send', title: t('Отправить приглашения'), group: 'actions', run: go(() => router.navigate('/send')) },
    { key: 'pay', icon: 'wallet', title: t('Оплатить мероприятие'), group: 'actions', run: go(() => router.navigate('/payment')) },
    { key: 'home', icon: 'home', title: t('На главную'), group: 'actions', run: go(() => router.navigate('/')) },
    { key: 'theme', icon: mode === 'dark' ? 'sun' : 'moon', title: mode === 'dark' ? t('Светлая тема') : t('Тёмная тема'), group: 'actions', run: go(toggle) },
    { key: 'notes', icon: 'notifications-outline', title: t('Уведомления'), group: 'actions', run: go(() => router.navigate('/notifications')) },
    { key: 'settings', icon: 'settings-outline', title: t('Настройки'), group: 'actions', run: go(() => router.navigate('/settings')) },
    ...events.map((e): Item => ({ key: `e${e.id}`, icon: 'calendar-outline', title: e.title, hint: `${formatDate(e.eventDate)} · ${e.address}`, group: 'events',
      run: go(() => { setCurrentId(e.id); router.navigate('/'); }) })),
    ...guests.map((g): Item => ({ key: `g${g.id}`, icon: 'people-outline', title: g.name, hint: formatPhone(g.phone), group: 'guests',
      run: go(() => router.navigate('/guests')) })),
  ], [events, guests, mode, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const found = items.filter((i) => !q || i.title.toLowerCase().includes(q) || (i.hint ?? '').toLowerCase().includes(q)
    || (digits.length >= 3 && (i.hint ?? '').replace(/\D/g, '').includes(digits)));
  const visible = q ? found : found.filter((i) => i.group !== 'guests');
  const groups = [...new Set(visible.map((i) => i.group))];

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={t('Поиск: гости, мероприятия, действия')} placeholderTextColor={colors.muted}
              style={styles.input} onSubmitEditing={() => visible[0]?.run()} returnKeyType="go" />
            {Platform.OS === 'web' ? <View style={styles.kbd}><T size={11} weight="semibold" color={colors.muted}>Esc</T></View> : (
              <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
            )}
          </View>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {groups.map((g) => (
              <View key={g} style={{ paddingVertical: 6 }}>
                <T size={11} weight="bold" color={colors.muted} style={styles.group}>{GROUP_TITLE[g]().toUpperCase()}</T>
                {visible.filter((i) => i.group === g).map((i, idx) => (
                  <Pressable key={i.key} onPress={i.run} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.item, (pressed || hovered || (q && idx === 0 && g === groups[0])) && { backgroundColor: colors.greenSoft }]}>
                    <View style={styles.itemIcon}><Ionicons name={i.icon} size={16} color={colors.green} /></View>
                    <View style={{ flex: 1 }}>
                      <T weight="semibold" size={14} numberOfLines={1}>{i.title}</T>
                      {i.hint ? <T size={12} color={colors.muted} numberOfLines={1}>{i.hint}</T> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
            {!visible.length ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <T weight="bold">{t('Ничего не найдено')}</T>
                <T size={13} color={colors.muted} style={{ marginTop: 4, textAlign: 'center' }}>{t('Попробуйте имя гостя, номер телефона или название тоя.')}</T>
              </View>
            ) : null}
          </ScrollView>
          {Platform.OS === 'web' ? (
            <View style={styles.footer}><T size={11} color={colors.muted}>{t('Enter — открыть · Ctrl+K / ⌘K — поиск в любом месте')}</T></View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, paddingTop: 70, paddingHorizontal: 14, alignItems: 'center' },
  panel: { width: '100%', maxWidth: 560, backgroundColor: colors.elevated, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, fontFamily: font.medium, color: colors.text, outlineStyle: 'none' } as object,
  kbd: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  group: { paddingHorizontal: 16, paddingVertical: 6, letterSpacing: 0.6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: 6, borderRadius: radius.sm },
  itemIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
}));
