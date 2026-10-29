import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { api, type EventMedia, type InviteLang } from '../../lib/api';
import { t, LANGS } from '../../lib/i18n';
import { formatPhone, normalizePhone } from '../../lib/phone';
import { useCurrentEvent } from '../../lib/current';
import { colors, radius, themed } from '../../lib/theme';
import { toIsoDate, toTime } from '../../lib/format';
import { Button, Card, ErrorText, FadeIn, Field, HeaderRow, Ionicons, Label, Muted, Notice, PressScale, SectionTitle, T } from '../../components/ui';
import { useTheme } from '../../lib/themeContext';
import { DateTimeFields } from '../../components/DateTimeFields';
import { TopHeader } from '../../components/TopHeader';
import { useToast } from '../../components/Toast';

const DEFAULT_TEXT: Record<InviteLang, string> = {
  ru: 'Будем рады разделить с вами наш особенный день!',
  kk: 'Қуанышымызбен бөлісуге шақырамыз!',
  en: 'We would be delighted to share our special day with you!',
};
const PRESETS = ['Свадебный той', 'Сүндет той', 'Тұсау кесер', 'Қыз ұзату', 'День рождения', 'Юбилей'];

// Ограничения WhatsApp для шапки шаблона: фото JPEG/PNG до 5 МБ, видео MP4/3GP до 16 МБ.
const MEDIA_LIMIT_MB: Record<string, number> = { 'image/jpeg': 5, 'image/png': 5, 'video/mp4': 16, 'video/3gpp': 16 };
type PendingMedia = { uri: string; type: 'image' | 'video'; mime: string; size: number; blob: Blob };
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',');

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(18, 0, 0, 0);
  return d;
}

// «Детали мероприятия» — шаг 1 из 3. Создаёт новое или редактирует текущее.
export default function EventForm() {
  const { lang: appLang } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { event, loading: eventsLoading, setCurrentId, reload } = useCurrentEvent(60000);
  const editing = mode !== 'new' && event ? event : null;
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [address, setAddress] = useState('');
  const [host, setHost] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [inviteLang, setInviteLang] = useState<InviteLang>(appLang);
  const [text, setText] = useState(DEFAULT_TEXT[appLang]);
  const [media, setMedia] = useState<EventMedia | null>(null);
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [firstReminder, setFirstReminder] = useState<7 | 10>(10);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ title: string; created: boolean } | null>(null);

  // Заполняем форму данными текущего мероприятия или очищаем для нового.
  const key = editing ? editing.id : 'new';
  useEffect(() => {
    if (editing) {
      const [y, m, d] = editing.eventDate.split('-').map(Number);
      const [hh, mm] = editing.eventTime.split(':').map(Number);
      setTitle(editing.title); setDate(new Date(y, m - 1, d, hh, mm)); setAddress(editing.address);
      setHost(editing.hostName ?? ''); setText(editing.invitationText); setFirstReminder(editing.firstReminderDays);
      setHostPhone(editing.hostPhone ? formatPhone(editing.hostPhone) : ''); setInviteLang(editing.lang ?? 'ru'); setMedia(editing.media ?? null);
    } else {
      setTitle(''); setDate(defaultDate()); setAddress(''); setHost(''); setText(DEFAULT_TEXT[appLang]); setFirstReminder(10);
      setHostPhone(''); setInviteLang(appLang); setMedia(null);
    }
    setPending(null); setRemoveMedia(false); setMediaError(null);
    setError(null);
    if (mode === 'new') setSaved(null);
  }, [key, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Фото или видео из галереи. Загружается на сервер при сохранении мероприятия.
  const pickMedia = async () => {
    setMediaError(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], quality: 0.85, allowsMultipleSelection: false,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const isVideo = a.type === 'video' || !!a.mimeType?.startsWith('video/');
    let mime = (a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg')).toLowerCase();
    if (mime === 'image/jpg') mime = 'image/jpeg';
    if (!MEDIA_LIMIT_MB[mime]) { setMediaError(t('Подходят фото JPEG/PNG или видео MP4')); return; }
    try {
      const blob = await (await fetch(a.uri)).blob();
      const size = blob.size || a.fileSize || 0;
      if (size > MEDIA_LIMIT_MB[mime] * 1024 * 1024) { setMediaError(t('Файл больше {n} МБ', { n: MEDIA_LIMIT_MB[mime] })); return; }
      setPending({ uri: a.uri, type: isVideo ? 'video' : 'image', mime, size, blob });
      setRemoveMedia(false);
    } catch {
      setMediaError(t('Не удалось открыть файл'));
    }
  };

  const save = async () => {
    if (!title.trim()) { setError(t('Введите название тоя')); return; }
    if (!address.trim()) { setError(t('Укажите ресторан или адрес')); return; }
    const phone = normalizePhone(hostPhone);
    if (!phone) { setError(t('Укажите номер телефона хозяина в формате +7 7XX XXX XX XX')); return; }
    setSaving(true);
    setError(null);
    const data = {
      title: title.trim(), event_date: toIsoDate(date), event_time: toTime(date), address: address.trim(),
      host_name: host.trim() || null, host_phone: phone, lang: inviteLang,
      invitation_text: text.trim() || DEFAULT_TEXT[inviteLang], first_reminder_days: firstReminder,
    };
    try {
      const saved = editing ? await api.updateEvent(editing.id, data) : await api.createEvent(data);
      setCurrentId(saved.id);
      try {
        if (pending) setMedia((await api.uploadMedia(saved.id, pending.blob, pending.mime)).media ?? null);
        else if (removeMedia && media) { await api.deleteMedia(saved.id); setMedia(null); }
        setPending(null); setRemoveMedia(false);
      } catch (e) {
        // Мероприятие сохранено, но файл не загрузился: остаёмся на форме, чтобы повторить.
        await reload();
        setMediaError(e instanceof Error ? e.message : t('Ошибка'));
        router.setParams({ mode: undefined });
        return;
      }
      await reload();
      toast(t('Мероприятие сохранено'));
      router.setParams({ mode: undefined });
      setSaved({ title: saved.title, created: !editing });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Ошибка'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <TopHeader />
        <View style={{ padding: 16 }}>
          <HeaderRow onBack={() => router.navigate('/')} right={t('Шаг {a} из {b}', { a: 1, b: 3 })} />
          {saved ? (
            <FadeIn>
              <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
                <View style={styles.okCircle}><Ionicons name="checkmark" size={30} color={colors.onLime} strokeWidth={3} /></View>
                <T weight="extrabold" size={20} style={{ marginTop: 14, textAlign: 'center' }}>{saved.created ? t('Мероприятие создано') : t('Изменения сохранены')}</T>
                <Muted style={{ marginTop: 6, textAlign: 'center' }}>«{saved.title}». {t('Следующий шаг — добавить гостей и отправить приглашения.')}</Muted>
                <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 20 }}>
                  <Button title={t('На главную')} icon="home" size="md" onPress={() => { setSaved(null); router.navigate('/'); }} />
                  <Button title={t('Добавить гостей')} icon="user-plus" variant="light" size="md" onPress={() => { setSaved(null); router.navigate('/guests'); }} />
                  <Button title={t('Изменить мероприятие')} icon="create-outline" variant="ghost" size="md" onPress={() => setSaved(null)} />
                </View>
              </Card>
            </FadeIn>
          ) : (<>
          <SectionTitle right={editing ? t('Редактирование') : eventsLoading ? undefined : t('Новое')}>{t('Детали мероприятия')}</SectionTitle>
          <Card>
            <Field label={t('Название тоя')} placeholder={t('Например, Тұсау кесер Айсулу')} value={title} onChangeText={setTitle} maxLength={50} />
            <View style={styles.presets}>
              {PRESETS.map((key) => {
                const p = t(key);
                return (
                  <Pressable key={key} onPress={() => setTitle(p)} style={[styles.chip, title === p && styles.chipOn]}>
                    <T weight="semibold" size={12} color={title === p ? colors.onPrimary : colors.green}>{p}</T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.grid2}>
              <View style={{ flex: 1 }}><Label>{t('Дата')}</Label></View>
              <View style={{ flex: 1 }}><Label>{t('Время')}</Label></View>
            </View>
            <DateTimeFields value={date} onChange={setDate} />
            <View style={{ height: 13 }} />
            <Field label={t('Ресторан / адрес')} placeholder={t('Название ресторана, адрес')} value={address} onChangeText={setAddress} maxLength={200} />
            <Field label={t('Имя хозяина / организатора')} placeholder={t('Как подписать приглашение')} value={host} onChangeText={setHost} maxLength={80} />
            <Field label={t('Номер телефона хозяина')} icon="call" placeholder="+7 7XX XXX XX XX" value={hostPhone} onChangeText={(v) => { setHostPhone(v); setError(null); }}
              keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={20} />
            <Label>{t('Язык приглашения')}</Label>
            <View style={[styles.segment, { marginBottom: 14 }]}>
              {LANGS.map((l) => {
                const on = inviteLang === l.value;
                return (
                  <Pressable key={l.value} style={[styles.segItem, on && styles.segOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    onPress={() => { if (text === DEFAULT_TEXT[inviteLang]) setText(DEFAULT_TEXT[l.value]); setInviteLang(l.value); }}>
                    <T weight="bold" size={13} color={on ? colors.onPrimary : colors.textSoft}>{l.label}</T>
                  </Pressable>
                );
              })}
            </View>
            <Field label={t('Текст приглашения (можно изменить)')} placeholder={t('Будем рады видеть вас...')} value={text} onChangeText={setText} multiline maxLength={1000} />

            <Label>{t('Фото или видео-приглашение')}</Label>
            {(() => {
              const shown = pending ?? (removeMedia ? null : media);
              if (!shown) {
                return (
                  <PressScale onPress={pickMedia} style={styles.mediaEmpty}>
                    <View style={styles.mediaIcon}><Ionicons name="image-plus" size={22} color={colors.green} /></View>
                    <View style={{ flex: 1 }}>
                      <T weight="bold" size={14}>{t('Добавить фото или видео')}</T>
                      <T size={12} color={colors.muted} style={{ marginTop: 2 }}>{t('Фото JPEG/PNG до 5 МБ, видео MP4 до 16 МБ')}</T>
                    </View>
                  </PressScale>
                );
              }
              const uri = pending ? pending.uri : media!.url;
              return (
                <View style={styles.mediaBox}>
                  {shown.type === 'image'
                    ? <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" accessibilityLabel={t('Фото-приглашение')} />
                    : <View style={[styles.mediaImage, styles.videoTile]}><Ionicons name="play" size={34} color="#FFFFFF" /><T size={12} color="#FFFFFF" style={{ marginTop: 6 }}>{t('Видео-приглашение')}</T></View>}
                  <View style={styles.mediaBar}>
                    <T size={12} color={colors.muted} style={{ flex: 1 }}>
                      {shown.type === 'video' ? t('Видео') : t('Фото')} · {mb(shown.size)} {t('МБ')}{pending ? ` · ${t('загрузится при сохранении')}` : ''}
                    </T>
                    <Pressable onPress={pickMedia} hitSlop={6}><T weight="bold" size={13} color={colors.green}>{t('Заменить')}</T></Pressable>
                    <Pressable onPress={() => { setPending(null); setRemoveMedia(true); }} hitSlop={6} style={{ marginLeft: 14 }}>
                      <T weight="bold" size={13} color={colors.red}>{t('Удалить')}</T>
                    </Pressable>
                  </View>
                </View>
              );
            })()}
            <T size={11} color={colors.muted} style={{ marginTop: 6, marginBottom: 14 }}>
              {t('Уйдёт автоматически вместе с приглашением всем гостям из списка, в том числе тем, кого добавите позже.')}
            </T>
            <ErrorText>{mediaError}</ErrorText>

            <Label>{t('Первое напоминание')}</Label>
            <View style={styles.segment}>
              {([10, 7] as const).map((d) => {
                const on = firstReminder === d;
                return (
                  <Pressable key={d} style={[styles.segItem, on && styles.segOn]} onPress={() => setFirstReminder(d)} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                    <Ionicons name="notifications-outline" size={14} color={on ? colors.onPrimary : colors.textSoft} />
                    <T weight="bold" size={13} color={on ? colors.onPrimary : colors.textSoft}>{t('За {n} дней', { n: d })}</T>
                  </Pressable>
                );
              })}
            </View>
            <T size={11} color={colors.muted} style={{ marginTop: 6, marginBottom: 14 }}>
              {t('Затем за 3 дня и за 1 день до тоя. Напоминания приходят в 9:00 по времени Астаны тем, кто ответил «Приду», и тем, кто ещё не ответил.')}
            </T>
            <ErrorText>{error}</ErrorText>
            <Button title={t('Сохранить мероприятие')} size="md" onPress={save} loading={saving} />
          </Card>
          <Notice>{t('Совет: сначала сохраните мероприятие, затем добавьте гостей и проверьте приглашение.')}</Notice>
          </>)}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.greenSoft },
  chipOn: { backgroundColor: colors.primary },
  grid2: { flexDirection: 'row', gap: 10 },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.sm, padding: 3, gap: 3 },
  segItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  segOn: { backgroundColor: colors.primary },
  mediaEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inputBorder, backgroundColor: colors.bg },
  mediaIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  mediaBox: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  mediaImage: { width: '100%', height: 200 },
  videoTile: { backgroundColor: '#10251D', alignItems: 'center', justifyContent: 'center' },
  mediaBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  okCircle: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
}));
