import { staffName } from '@/features/staff/names';
import type { StaffMember } from '@/features/staff/types';

export function ClassTeacherField({ staff, value }: { staff: StaffMember[]; value?: string | null }) {
  return (
    <label className="field">
      <span>Class teacher</span>
      <select name="classTeacherId" defaultValue={value ?? ''}>
        <option value="">Not assigned</option>
        {staff
          .filter((s) => s.position === 'Teacher' || s.position === 'Assistant Headteacher')
          .map((s) => (
            <option key={s.id} value={s.id}>
              {staffName(s)}
            </option>
          ))}
      </select>
    </label>
  );
}

export function RoomField({ value }: { value?: string | null }) {
  return (
    <label className="field">
      <span>Room</span>
      <input name="room" defaultValue={value ?? ''} placeholder="JHS Block, Room 7" />
    </label>
  );
}
