const User = {
  async findUserById(db, id) {
    const user = await db('users').where('id', id).first()
    return user
  },
  async findUserByEmail(db, email) {
    const user = await db('users').where('email', email).first()
    return user
  },
}

export default User
