import fs from "fs";
import path from "path";
import Bot from "../models/bot";
import { ServerError, BadRequestError, NotFoundError } from "../errors";
import SignalStore from "../models/signalstore";
import config from "../config";
import log from "../logger";

const bots = {
  async registerBotForm(ctx) {
    await ctx.render("bot/register", {
      isProd: config.env.isProd
    });
  },

  async registerBot(ctx) {
    const { id: userId } = ctx.state.user;
    const { botId, number } = ctx.request.body;
    const regex = /[^\d+]/gm;
    const sanitizedNumber = number.replace(regex, "").trim();
    let bot;
    if (botId) {
      bot = await ctx.state.botFactory.findByUser(userId, botId);
      if (!bot) throw new BadRequestError(`no bot found with that id`);
    } else if (sanitizedNumber) {
      bot = await ctx.state.botFactory.create(userId, sanitizedNumber);
      if (!bot) throw new ServerError(`error creating bot`);
    } else {
      throw new BadRequestError("invalid number");
    }

    try {
      await bot.requestSMSVerification();
      await SignalStore.updateStore(ctx.app.db, bot.id, bot.getStoreData());
      await ctx.render("bot/verify", {
        bot: bot.botData,
        isProd: config.env.isProd
      });
    } catch (err) {
      log.error("Error requesting SMS verification");
      log.error(err);
      await ctx.render("error", {
        message: "Error requesting SMS verification",
        errorData: JSON.stringify(err)
      });
    }
  },
  async requestVoiceVerification(ctx) {
    const { id: userId } = ctx.state.user;
    const { botId } = ctx.request.body;
    let bot;
    if (botId) {
      bot = await ctx.state.botFactory.findByUser(userId, botId);
      if (!bot) throw new NotFoundError();
    } else {
      throw new BadRequestError();
    }
    try {
      await bot.requestVoiceVerification(bot.number);
      await SignalStore.updateStore(ctx.app.db, bot.id, bot.getStoreData());
      await ctx.render("bot/verify", {
        bot: bot.botData,
        isProd: config.env.isProd
      });
    } catch (err) {
      log.error("Error requesting voice verification");
      log.error(err);
      ctx.status = 500;
      await ctx.render("error", {
        message: "Error requesting voice verification",
        errorData: JSON.stringify(err)
      });
    }
  },
  async verifyForm(ctx) {
    const { bot: botId } = ctx.query;
    if (!botId) throw new NotFoundError();
    const { id: userId } = ctx.state.user;
    const bot = await ctx.state.botFactory.findByUser(userId, botId);
    if (!bot) throw new NotFoundError(`Bot ${botId} not found`);
    await ctx.render("bot/verify", {
      bot: bot.botData
    });
  },
  async verify(ctx) {
    const { botId, code } = ctx.request.body;
    const bot = await ctx.state.botFactory.findByUser(ctx.state.user.id, botId);
    if (!bot) throw new NotFoundError();
    if (!code) throw new BadRequestError();
    const regex = /[^\d]/gm;
    const sanitizedCode = code.replace(regex, "").trim();
    try {
      await bot.verifyNumber(sanitizedCode);
    } catch (err) {
      if (err.name === "HTTPError") {
        return ctx.render("bot/verify", {
          bot: bot.botData,
          error: err.message,
          isProd: config.env.isProd
        });
      }
      throw err;
    }
    await Bot.markVerified(ctx.app.db, bot.id);
    await SignalStore.updateStore(ctx.app.db, bot.id, bot.getStoreData());
    return ctx.redirect("/account");
  },
  async cycle(ctx) {
    const { botId } = ctx.request.body;
    const bot = await ctx.state.botFactory.findByUser(ctx.state.user.id, botId);
    if (!bot) throw new NotFoundError();
    const { token } = await Bot.cycleToken(ctx.app.db, bot.id);
    bot.botData.token = token;
    ctx.redirect("/account");
  },
  async delete(ctx) {
    const { botId } = ctx.request.body;
    // const bot = await ctx.state.botFactory.findByUser(ctx.state.user.id, botId);
    // if (!bot) throw new NotFoundError();
    await ctx.state.botFactory.destroy(ctx.state.user.id, botId);
    // await Bot.deleteBot(ctx.app.db, botId);
    ctx.redirect("/account");
  },
  async sendForm(ctx) {
    const bot = await ctx.state.botFactory.findByToken(ctx.params.token);
    if (!bot) throw new NotFoundError();
    await ctx.render("bot/send", {
      bot: bot.botData,
      isProd: config.env.isProd
    });
  },
  async getSelf(ctx) {
    const { token } = ctx.params;
    const bot = await ctx.state.botFactory.findByToken(token);
    if (!bot) throw new NotFoundError("bot not found with that token");

    switch (ctx.accepts("html", "json")) {
      case "html":
        ctx.redirect("/account");
        break;
      case "json":
      default:
        ctx.body = bot.botData;
        break;
    }
  },
  async send(ctx) {
    const { token } = ctx.params;
    const { recipient, message } = ctx.request.body;
    const bot = await ctx.state.botFactory.findByToken(token);
    if (!bot) throw new NotFoundError();
    let errorMessage;
    let result;
    try {
      result = await bot.send(recipient, message);
    } catch (e) {
      if (e.errors.length > 0) {
        log.error(e.errors[0]);
        errorMessage = e.errors[0].message;
      }
    }
    await SignalStore.updateStore(ctx.app.db, bot.id, bot.getStoreData());
    switch (ctx.accepts("html", "json")) {
      case "html":
        await ctx.render("bot/send", {
          bot: bot.botData,
          message,
          recipient,
          error: errorMessage,
          isProd: config.env.isProd
        });
        break;
      case "json":
      default:
        if (errorMessage) ctx.status = 500;
        else ctx.status = 200;
        ctx.body = { result, error: errorMessage };
        break;
    }
  },
  async receive(ctx) {
    const { token } = ctx.params;
    const bot = await ctx.state.botFactory.findByToken(token);
    if (!bot) throw new NotFoundError();
    let errorMessage;
    let messages = [];
    try {
      messages = await bot.receive();
    } catch (e) {
      if (e.errors && e.errors.length > 0) {
        log.error(e.errors[0]);
        errorMessage = e.errors[0].message;
      }
      if (e.message) {
        errorMessage = e.message;
      }
    }
    await SignalStore.updateStore(ctx.app.db, bot.id, bot.getStoreData());
    ctx.status = errorMessage ? 500 : 200;

    switch (ctx.accepts("html", "json")) {
      case "html":
        await ctx.render("bot/receive", {
          bot: bot.botData,
          messages,
          error: errorMessage
        });
        break;
      case "json":
      default: {
        const result = {
          messages,
          bot: bot.botData
        };
        if (errorMessage) result.error = errorMessage;
        ctx.body = result;
        break;
      }
    }
  },
  async getFile(ctx) {
    const { token, source, timestamp, filename } = ctx.params;
    const bot = await ctx.state.botFactory.findByToken(token);
    if (!bot) throw new NotFoundError();
    const filePath = path.join(
      config.server.files,
      bot.id,
      source,
      timestamp,
      filename
    );
    const stat = await fs.promises.stat(filePath);
    if (stat.isFile()) {
      ctx.type = path.extname(filePath);
      ctx.body = fs.createReadStream(filePath);
    }
  }
};
export default bots;
