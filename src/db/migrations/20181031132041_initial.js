exports.up = function up(knex) {
  return knex.schema

    .createTable('users', (table) => {
      table.string('id').unique().primary().notNullable()
      table.string('email').unique().notNullable()
      table.string('username').unique().notNullable()
      table.string('password').notNullable()
      table.timestamps(true, true)
    })

    .createTable('bots', (table) => {
      table.string('id').unique().primary().notNullable()
      table.string('number').unique().notNullable()
      table.string('user_id').notNullable()
      table.string('token').notNullable()
      table.boolean('is_verified').defaultTo('false').notNullable()

      table.timestamps(true, true)

      table.foreign('user_id').references('users.id')
    })

    .createTable('signalstore', (table) => {
      table.string('bot_id').unique().primary().notNullable()
      table.jsonb('data')

      table.timestamps(true, true)

      table.foreign('bot_id').references('bots.id')
    })
}

exports.down = function down(knex) {
  return knex.schema
    .dropTableIfExists('signalstore')
    .dropTableIfExists('bots')
    .dropTableIfExists('users')
}
