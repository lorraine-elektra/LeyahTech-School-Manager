import 'server-only';
import { revalidatePath } from 'next/cache';

// Every write refreshes all of the school's pages, since most screens show totals that a single change can affect.
export function schoolChanged(viewer: { school: { slug: string } }) {
  revalidatePath(`/${viewer.school.slug}`, 'layout');
}
