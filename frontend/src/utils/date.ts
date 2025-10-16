import { format, isValid, parseISO } from 'date-fns';

const DEFAULT_FORMAT = 'dd/MM/yyyy';

const normalizeToDate = (value?: string | number | Date | null) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return isValid(fromNumber) ? fromNumber : null;
  }

  if (typeof value === 'string') {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      return parsed;
    }

    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
  }

  return null;
};

export const formatDate = (
  value?: string | number | Date | null,
  dateFormat: string = DEFAULT_FORMAT,
): string => {
  const date = normalizeToDate(value);
  if (!date) {
    return '—';
  }

  try {
    return format(date, dateFormat);
  } catch (error) {
    console.error('[formatDate] Failed to format date', error);
    return '—';
  }
};
