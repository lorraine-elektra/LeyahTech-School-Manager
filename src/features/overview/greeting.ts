// Ghana keeps GMT all year, so UTC hours are local hours.
export function greeting(now = new Date()): string {
  const hour = now.getUTCHours();
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}
