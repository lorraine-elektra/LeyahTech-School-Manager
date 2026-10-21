import { allow, canViewFees, isOfficeStaff } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { FeeAccountsPage, type FeeAccountFilters } from '@/features/fees/FeeAccountsPage';

export default async function Page({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<FeeAccountFilters> }) {
  const viewer = await requireViewer((await params).school);
  allow(canViewFees(viewer) && isOfficeStaff(viewer));
  return <FeeAccountsPage viewer={viewer} filters={await searchParams} />;
}
