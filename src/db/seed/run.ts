import { db } from '../client';
import { createSeedData } from './createSeedData';
import { deleteSchool, loadSeed } from './loadSeed';

async function main() {
  const dataset = createSeedData();
  await deleteSchool(db, dataset.school.slug);
  const school = await loadSeed(db, dataset);
  console.log(`Loaded ${school.name}: ${dataset.students.length} students, ${dataset.payments.length} payments.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
