import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {db, queryClient} from './client';

/** Apply pending SQL migrations from ./migrations, then exit. */
async function main() {
  console.log('Running migrations…');
  await migrate(db, {migrationsFolder: './migrations'});
  console.log('Migrations complete.');
  await queryClient.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
