export const formatDate = (value: string, withTime = false) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short', timeZone: 'UTC' } : {}),
  }).format(new Date(value));

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

export const daysBetween = (from: string, to: string) =>
  Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);

export const utcDateKey = (value: string) => new Date(value).toISOString().slice(0, 10);

export const formatMonthYear = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(value),
  );

export const dueRisk = (now: string, dueDate?: string) => {
  if (!dueDate) return { days: Number.POSITIVE_INFINITY, label: 'Tarih belirlenmedi' } as const;
  const days = daysBetween(now, dueDate);
  if (days < 0) return { days, label: `${Math.abs(days)} gün gecikmiş` } as const;
  if (days === 0) return { days, label: 'Bugün · son gün' } as const;
  return { days, label: `${days} gün kaldı` } as const;
};
