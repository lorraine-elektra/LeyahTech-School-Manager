import type { FeeItem } from './types';

export const scheduleColumns = [
  { key: 'JHS', label: 'JHS (Basic 7 to 9)', level: 'JHS', programme: null },
  { key: 'SHS', label: 'SHS General Arts and Business', level: 'SHS', programme: null },
  { key: 'SHS-Science', label: 'SHS Science', level: 'SHS', programme: 'Science' },
] as const;

export type ScheduleColumn = (typeof scheduleColumns)[number];

// Items without a programme apply to every class at that level.
export const itemsForColumn = (items: FeeItem[], column: ScheduleColumn) =>
  items.filter((i) => i.level === column.level && (!i.programme || i.programme === column.programme));

// The cell a column owns, so a shared SHS item is only edited once.
export const ownItem = (items: FeeItem[], column: ScheduleColumn, name: string) =>
  items.find((i) => i.name === name && i.level === column.level && (i.programme ?? null) === column.programme);
