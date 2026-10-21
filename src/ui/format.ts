const moneyFormat = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(amount: number): string {
  const formatted = moneyFormat.format(Math.abs(amount));
  return amount < 0 ? `-GH₵ ${formatted}` : `GH₵ ${formatted}`;
}

// Ledger balances below zero mean the family has paid ahead.
export function formatBalance(amount: number): string {
  return amount < 0 ? `${formatMoney(-amount)} in credit` : formatMoney(amount);
}

export function formatAmount(amount: number): string {
  return moneyFormat.format(amount);
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

export function formatDateWithDay(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00`).getDay();
  return `${weekdays[day]} ${formatDate(isoDate)}`;
}

export function formatTime(isoDateTime: string): string {
  return isoDateTime.slice(11, 16);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function ordinal(position: number): string {
  const tens = position % 100;
  if (tens >= 11 && tens <= 13) return `${position}th`;
  return `${position}${['th', 'st', 'nd', 'rd'][position % 10] ?? 'th'}`;
}

export function ageOn(dateOfBirth: string, onDate: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

// Accepts 0241234567, +233241234567 or 233 24 123 4567 and returns 024 123 4567.
export function normalisePhone(input: string): string | undefined {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('233')) digits = `0${digits.slice(3)}`;
  if (!/^0[235]\d{8}$/.test(digits)) return undefined;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function wordsBelowThousand(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest < 20 ? ones[rest] : `${tens[Math.floor(rest / 10)]}${rest % 10 ? `-${ones[rest % 10]}` : ''}`;
  if (!hundred) return restWords;
  return `${ones[hundred]} hundred${rest ? ` and ${restWords}` : ''}`;
}

function wholeNumberWords(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  for (const [size, label] of [[1_000_000, 'million'], [1_000, 'thousand']] as const) {
    if (n >= size) {
      parts.push(`${wordsBelowThousand(Math.floor(n / size))} ${label}`);
      n %= size;
    }
  }
  if (n) parts.push(parts.length && n < 100 ? `and ${wordsBelowThousand(n)}` : wordsBelowThousand(n));
  return parts.join(' ');
}

// Receipts state the amount in words, e.g. "One thousand two hundred Ghana cedis and fifty pesewas".
export function amountInWords(amount: number): string {
  const cedis = Math.floor(amount);
  const pesewas = Math.round((amount - cedis) * 100);
  const words = `${wholeNumberWords(cedis)} Ghana cedis${pesewas ? ` and ${wholeNumberWords(pesewas)} pesewas` : ''}`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
