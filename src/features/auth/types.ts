export type Role = 'headteacher' | 'bursar' | 'classTeacher' | 'subjectTeacher' | 'parent';

export const roleLabels: Record<Role, string> = {
  headteacher: 'Headteacher',
  bursar: 'Bursar',
  classTeacher: 'Class Teacher',
  subjectTeacher: 'Subject Teacher',
  parent: 'Parent',
};
