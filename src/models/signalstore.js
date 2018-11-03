const SignalStore = {

  async getOrCreateStore(db, botId) {
    const store = await this.getStore(db, botId)
    if (store) return store
    return this.createStore(db, botId)
  },
  async createStore(db, botId) {
    await db('signalstore').insert({ bot_id: botId, data: {} })
    const store = this.getStore(db, botId)
    return store
  },
  async getStore(db, botId) {
    const store = await db('signalstore')
      .where('bot_id', botId)
      .first()
    return store
  },

  async updateStore(db, botId, data) {
    await db('signalstore')
      .where('bot_id', botId)
      .update({ data })
    return data
  },
  async deleteStore(db, botId) {
    await db('signalstore').where('bot_id', botId).del()
  },
}
export default SignalStore
