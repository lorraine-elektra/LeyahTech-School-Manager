import { requireViewer } from '@/features/auth/session';
import { BursarOverview } from '@/features/overview/BursarOverview';
import { HeadteacherOverview } from '@/features/overview/HeadteacherOverview';
import { ParentOverview } from '@/features/overview/ParentOverview';
import { TeacherOverview } from '@/features/overview/TeacherOverview';

export default async function OverviewPage({ params }: { params: Promise<{ school: string }> }) {
  const viewer = await requireViewer((await params).school);
  switch (viewer.role) {
    case 'headteacher':
      return <HeadteacherOverview viewer={viewer} />;
    case 'bursar':
      return <BursarOverview viewer={viewer} />;
    case 'parent':
      return <ParentOverview viewer={viewer} />;
    default:
      return <TeacherOverview viewer={viewer} />;
  }
}
