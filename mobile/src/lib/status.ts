import type { EventItem, Rsvp } from './api';
import { colors } from './theme';

export function eventStatus(e: EventItem) {
  if (e.invitesSentAt) return { label: 'Отправлено', color: colors.yes, bg: colors.yesLight };
  if (e.paymentStatus === 'paid') return { label: 'Оплачено', color: colors.notice, bg: colors.goldLight };
  if (e.paymentStatus === 'pending') return { label: 'Ждёт оплаты', color: colors.amber, bg: colors.amberLight };
  return { label: 'Черновик', color: colors.notice, bg: colors.goldLight };
}

export const rsvpLabel = (r: Rsvp): { label: string; color: string; bg: string } => ({
  pending: { label: 'Не ответил', color: colors.amber, bg: colors.amberLight },
  yes: { label: 'Приду', color: colors.yes, bg: colors.yesLight },
  no: { label: 'Не смогу', color: colors.red, bg: colors.redLight },
})[r];
