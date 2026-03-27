export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id'], 'IDX_password_reset_tokens_user_id');
    table.index(['expires_at'], 'IDX_password_reset_tokens_expires_at');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
}
