import { requireViewer } from '@/features/auth/session';
import { StudentsPage } from '@/features/students/StudentsPage';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ q?: string; class?: string; status?: string; page?: string }>;
}) {
  const viewer = await requireViewer((await params).school);
  return <StudentsPage viewer={viewer} filters={await searchParams} />;
}
