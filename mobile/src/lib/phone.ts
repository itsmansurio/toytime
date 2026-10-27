// Та же нормализация, что и на сервере: +7XXXXXXXXXX.
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 10) digits = '7' + digits;
  if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length === 11 && digits.startsWith('7')) return '+' + digits;
  if (input.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) return '+' + digits;
  return null;
}

export function formatPhone(e164: string): string {
  const m = e164.match(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
