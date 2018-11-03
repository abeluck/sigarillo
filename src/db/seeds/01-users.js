// noinspection ES6ConvertRequireIntoImport
const bcrypt = require('bcrypt')

const users = [
  {
    name: 'admin',
    id: '24089cf6-1696-4a00-9995-47cb4bc37006',
  },
]

function getUsers() {
  return users.map(u => ({
    id: u.id,
    email: u.email || `${u.name}@demo.com`,
    username: u.name,
    password: bcrypt.hashSync('admin', 10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

exports.getUsers = getUsers

exports.seed = async knex => knex('users').insert(getUsers())
