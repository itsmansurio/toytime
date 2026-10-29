import type { EventItem, Rsvp } from './api';
import { colors } from './theme';
import { t } from './i18n';

export function eventStatus(e: EventItem) {
  if (e.invitesSentAt) return { label: t('Отправлено'), color: colors.yes, bg: colors.yesLight };
  if (e.paymentStatus === 'paid') return { label: t('Оплачено'), color: colors.notice, bg: colors.goldLight };
  if (e.paymentStatus === 'pending') return { label: t('Ждёт оплаты'), color: colors.amber, bg: colors.amberLight };
  return { label: t('Черновик'), color: colors.notice, bg: colors.goldLight };
}

export const rsvpLabel = (r: Rsvp): { label: string; color: string; bg: string } => ({
  pending: { label: t('Не ответил'), color: colors.amber, bg: colors.amberLight },
  yes: { label: t('Приду'), color: colors.yes, bg: colors.yesLight },
  no: { label: t('Не смогу'), color: colors.red, bg: colors.redLight },
})[r];
