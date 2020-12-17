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

  async findByUser(userId, botId, load = true) {
    let bot = this.bots.get(botId);
    if (bot) {
      log.debug("Found loaded bot.");
      return bot;
    }
    log.debug("No loaded bot found, searching database");
    const botData = await BotModel.findBotForUser(this.db, userId, botId);
    const { data: storeData } = await SignalStore.getOrCreateStore(
      this.db,
      botData.id
    );
    const filePath = path.join(config.server.files, botData.id);
    log.debug("Retrieved bot data:", botData);
    if (botData && load) {
      bot = new SignalService(this.db, filePath, botData, storeData);
      if (bot) {
        log.debug("Found and loaded existing bot");
        await bot.start();
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

  async findByToken(token) {
    log.debug("No loaded bot found, searching database");
    const botData = await BotModel.findBotByToken(this.db, token);
    if (botData) {
      let bot = this.bots.get(botData.id);
      if (bot) {
        log.debug("Found loaded bot.");
        return bot;
      }
      const { data: storeData } = await SignalStore.getOrCreateStore(
        this.db,
        botData.id
      );
      const filePath = path.join(config.server.files, botData.id);
      bot = new SignalService(this.db, filePath, botData, storeData);
      if (bot) {
        log.debug("Found and loaded existing bot");
        await bot.start();
        this.bots.set(botData.id, bot);
        return bot;
      }
      log.debug("Failed to load bot from database");
      throw new ServerError();
    } else {
      log.debug("No existing bot found");
      throw new NotFoundError();
    }
  }

  async create(userId, number) {
    log.debug(`Creating a new bot for user ${userId} with number ${number}`);
    try {
      const botData = await BotModel.createBot(this.db, userId, number);
      const { data: storeData } = await SignalStore.getOrCreateStore(
        this.db,
        botData.id
      );
      const filePath = path.join(config.server.files, botData.id);
      const bot = new SignalService(this.db, filePath, botData, storeData);
      if (bot) {
        await bot.start();
        this.bots.set(botData.id, bot);
        return bot;
      }
      throw new Error("Failed to create SignalService");
    } catch (err) {
      log.error(
        "Error creating bot: ",
        err.message ? err.message : "No error message"
      );
      throw new ServerError();
    }
  }

  async destroy(userId, botId) {
    log.debug(`Destroying bot with id ${botId} for user ${userId}`);
    try {
      const bot = await this.findByUser(userId, botId, false);
      if (bot) {
        if (bot instanceof SignalService) {
          await bot.stop();
          if (this.bots.delete(botId)) {
            log.debug(`Deleted bot with id ${botId}`);
          }
        }
        await SignalStore.deleteStore(this.db, botId);
        await BotModel.deleteBot(this.db, botId);
      }
      return;
    } catch (err) {
      log.error(`Failed to delete bot ${botId}: `, err);
      throw err;
    }
  }
}
