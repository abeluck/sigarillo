import uuid from "uuid/v4";
import bcrypt from "bcrypt";
// import log from "../logger";

const User = {
  async countUsers(db) {
    const result = await db("users").count();
    if (!result || !result.length) return 0;
    const { count } = result[0];
    return parseInt(count, 10);
  },
  async findUserById(db, id) {
    const user = await db("users")
      .where("id", id)
      .first();
    return user;
  },
  async findUserByEmail(db, email) {
    const user = await db("users")
      .where("email", email)
      .first();
    return user;
  },

  async createUser(db, email, password) {
    const userId = uuid();
    await db("users").insert({
      id: userId,
      email,
      username: email,
      password: bcrypt.hashSync(password, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return this.findUserById(db, userId);
  }
};

export default User;
