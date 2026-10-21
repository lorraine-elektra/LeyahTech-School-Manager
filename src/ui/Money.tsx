import { formatMoney } from './format';

export function Money({ amount, plain }: { amount: number; plain?: boolean }) {
  return <span className={plain ? undefined : amount > 0 ? undefined : 'muted'}>{formatMoney(amount)}</span>;
}
