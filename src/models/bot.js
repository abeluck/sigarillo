import uuid from "uuid/v4";

const Bot = {
  async markVerified(db, botId) {
    await db("bots")
      .where("id", botId)
      .update({ is_verified: true });
    return this.findBotById(db, botId);
  },
  async findAllBotsForUser(db, userId) {
    const bots = await db("bots").where("user_id", userId);
    return bots;
  },
  async findBotByToken(db, token) {
    const bot = await db("bots")
      .where({ token })
      .first();
    return bot;
  },
  async findBotForUser(db, userId, id) {
    const bot = await db("bots")
      .where({ id, user_id: userId })
      .first();
    return bot;
  },
  async findBotById(db, id) {
    const bot = await db("bots")
      .where("id", id)
      .first();
    return bot;
  },
  async findBotByNumber(db, number) {
    const bot = await db("bots")
      .where("number", number)
      .first();
    return bot;
  },
  async createBot(db, userId, number) {
    const botId = uuid();
    const token = uuid();
    await db("bots").insert({
      number,
      token,
      id: botId,
      user_id: userId
    });
    return this.findBotById(db, botId);
  },
  async cycleToken(db, botId) {
    const newToken = uuid();
    await db("bots")
      .where({ id: botId })
      .update({ token: newToken });
    return this.findBotById(db, botId);
  },
  async deleteBot(db, botId) {
    await db("bots")
      .where({ id: botId })
      .del();
  }
};

export default Bot;
