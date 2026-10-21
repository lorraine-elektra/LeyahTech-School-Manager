import type { StaffMember } from './types';

export function staffName(member: Pick<StaffMember, 'title' | 'firstName' | 'surname'> | undefined | null): string {
  return member ? `${member.title} ${member.firstName} ${member.surname}` : '';
}
