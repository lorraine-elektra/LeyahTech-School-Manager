import type { feeItems, feePayments, openingBalances, scholarships } from '@/db/schema';

export type FeeItem = typeof feeItems.$inferSelect;
export type Scholarship = typeof scholarships.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type PaymentMethod = FeePayment['method'];
export type OpeningBalance = typeof openingBalances.$inferSelect;

export const paymentMethods: PaymentMethod[] = ['Cash', 'Mobile Money', 'Bank deposit', 'Cheque'];
