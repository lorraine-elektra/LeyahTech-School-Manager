import type { staff } from '@/db/schema';

export const staffPositions = ['Headteacher', 'Assistant Headteacher', 'Bursar', 'Accounts Clerk', 'Teacher'] as const;
export type StaffPosition = (typeof staffPositions)[number];
export type StaffMember = typeof staff.$inferSelect;
