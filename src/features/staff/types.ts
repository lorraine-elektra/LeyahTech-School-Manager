import type { staff } from '@/db/schema';

export type StaffPosition = 'Headteacher' | 'Assistant Headteacher' | 'Bursar' | 'Accounts Clerk' | 'Teacher';
export type StaffMember = typeof staff.$inferSelect;
