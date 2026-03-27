import bcrypt from 'bcrypt';

const DEFAULT_ADMIN_EMAIL = 'admin@cspeixes.local';
const DEFAULT_ADMIN_NAME = 'Administrador';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';

function resolveAdminSeedConfig() {
  return {
    email: process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
    name: process.env.SEED_ADMIN_NAME || DEFAULT_ADMIN_NAME,
    password: process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  };
}

export async function seed(knex) {
  const admin = resolveAdminSeedConfig();
  const hashedPassword = await bcrypt.hash(admin.password, 10);

  await knex('users')
    .insert({
      email: admin.email,
      name: admin.name,
      password: hashedPassword,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('email')
    .merge({
      name: admin.name,
      password: hashedPassword,
      updated_at: knex.fn.now(),
    });

  return {
    email: admin.email,
  };
}

export async function down(knex, meta) {
  const admin = resolveAdminSeedConfig();
  const email = meta?.email || admin.email;

  await knex('users')
    .where({ email })
    .delete();
}
