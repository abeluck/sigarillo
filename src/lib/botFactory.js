import path from "path";
import BotModel from "../models/bot";
import { ServerError, NotFoundError } from "../errors";
import SignalService from "./signal";
import SignalStore from "../models/signalstore";
import config from "../config";
import log from "../logger";

export default class BotFactory {
  constructor(db, filePath) {
    this.db = db;
    this.filePath = filePath;
    this.bots = new Map();
  }

  async find(botId, userId, load = true) {
    let bot = this.bots.get(botId);
    if (bot) {
      log.debug("Found loaded bot.");
      return bot;
    }
    log.debug("No loaded bot found, searching database");
    const botData = BotModel.findBotForUser(this.db, userId, botId);
    const storeData = await SignalStore.getOrCreateStore(this.db, botData.id);
    const filePath = path.join(config.server.files, botData.id);
    if (botData && load) {
      bot = new SignalService(this.db, filePath, botData, storeData);
      if (bot) {
        log.debug("Found and loaded existing bot");
        this.bots.set(botData.id, bot);
        return bot;
      }
      log.debug("Failed to load bot from database");
      throw new ServerError();
    } else if (botData && !load) {
      log.debug("Found bot but deferring load");
      return botData;
    } else {
      log.debug("No existing bot found");
      throw new NotFoundError();
    }
  }

  async create(userId, number) {
    const botData = BotModel.createBot(this.db, userId, number);
    const storeData = await SignalStore.getOrCreateStore(this.db, botData.id);
    const filePath = path.join(config.server.files, botData.id);
    const bot = new SignalService(this.db, filePath, botData, storeData);
    if (bot) {
      this.bots.set(botData.id, bot);
    } else {
      log.error("Error creating bot");
      throw new ServerError();
    }
  }

  async destroy(botId, userId) {
    try {
      const bot = await this.find(botId, userId, false);
      if (bot) {
        if (bot instanceof SignalService) {
          await bot.stop();
        }
        if (this.bots.delete(botId)) {
          log.debug(`Deleted bot with id ${botId}`);
        } else {
          log.debug(`Failed to delete bot with id ${botId}`);
          throw new ServerError();
        }
      }
    } catch (err) {
      log.error("Failed to find bot to destroy");
      throw err;
    }
  }
}
