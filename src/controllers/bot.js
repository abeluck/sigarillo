import SignalService from "../lib/signal";
import Bot from "../models/bot";
import { BadRequestError, NotFoundError } from "../errors";
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
      bot = await Bot.findBotForUser(ctx.app.db, userId, botId);
    } else if (sanitizedNumber) {
      bot = await Bot.createBot(ctx.app.db, userId, sanitizedNumber);
    } else {
      throw new BadRequestError();
    }

    try {
      const signalStore = await SignalStore.getOrCreateStore(
        ctx.app.db,
        bot.id
      );
      const signal = new SignalService(bot.number, signalStore.data);
      await signal.requestSMSVerification(bot.number);
      await SignalStore.updateStore(ctx.app.db, bot.id, signal.getStoreData());
      await ctx.render("bot/verify", {
        bot,
        isProd: config.env.isProd
      });
    } catch (err) {
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
      bot = await Bot.findBotForUser(ctx.app.db, userId, botId);
      if (!bot) throw new NotFoundError();
    } else {
      throw new BadRequestError();
    }
    try {
      const signalStore = await SignalStore.getOrCreateStore(
        ctx.app.db,
        bot.id
      );
      const signal = new SignalService(bot.number, signalStore.data);
      await signal.requestVoiceVerification(bot.number);
      await SignalStore.updateStore(ctx.app.db, bot.id, signal.getStoreData());
      await ctx.render("bot/verify", {
        bot,
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
    const bot = await Bot.findBotForUser(ctx.app.db, userId, botId);
    if (!bot) throw new NotFoundError(`Bot ${botId} not found`);
    await ctx.render("bot/verify", {
      bot
    });
  },
  async verify(ctx) {
    const { botId, code } = ctx.request.body;
    const bot = await Bot.findBotForUser(ctx.app.db, ctx.state.user.id, botId);
    if (!bot) throw new NotFoundError();
    if (!code) throw new BadRequesError();
    const signalStore = await SignalStore.getStore(ctx.app.db, bot.id);
    const signal = new SignalService(bot.number, signalStore.data);
    const regex = /[^\d]/gm;
    const sanitizedCode = code.replace(regex, "").trim();
    try {
      const result = await signal.verifyNumber(bot.number, sanitizedCode);
    } catch (err) {
      if (err.name === "HTTPError") {
        await ctx.render("bot/verify", {
          bot,
          error: err.message,
          isProd: config.env.isProd
        });
        return;
      }
      throw err;
    }
    await Bot.markVerified(ctx.app.db, bot.id);
    await SignalStore.updateStore(ctx.app.db, bot.id, signal.getStoreData());
    ctx.redirect("/account");
  },
  async cycle(ctx) {
    const { botId } = ctx.request.body;
    const bot = await Bot.findBotForUser(ctx.app.db, ctx.state.user.id, botId);
    if (!bot) throw new NotFoundError();
    await Bot.cycleToken(ctx.app.db, bot.id);
    ctx.redirect("/account");
  },
  async delete(ctx) {
    const { botId } = ctx.request.body;
    const bot = await Bot.findBotForUser(ctx.app.db, ctx.state.user.id, botId);
    if (!bot) throw new NotFoundError();
    await SignalStore.deleteStore(ctx.app.db, bot.id);
    await Bot.deleteBot(ctx.app.db, bot.id);
    ctx.redirect("/account");
  },
  async sendForm(ctx) {
    const bot = await Bot.findBotByToken(ctx.app.db, ctx.params.token);
    if (!bot) throw new NotFoundError();
    await ctx.render("bot/send", {
      bot,
      isProd: config.env.isProd
    });
  },
  async getSelf(ctx) {
    const { token } = ctx.params;
    const bot = await Bot.findBotByToken(ctx.app.db, token);
    if (!bot) throw new NotFoundError();

    switch (ctx.accepts("html", "json")) {
      case "html":
        ctx.redirect("/account");
        break;
      case "json":
      default:
        ctx.body = bot;
        break;
    }
  },
  async send(ctx) {
    return ctx.app.db.transaction(async tx => {
      const { token } = ctx.params;
      const { recipient, message } = ctx.request.body;
      const bot = await Bot.findBotByToken(tx, token);
      if (!bot) throw new NotFoundError();
      const signalStore = await SignalStore.getStore(tx, bot.id);
      const signal = new SignalService(bot.number, signalStore.data);
      let errorMessage;
      let result;
      try {
        result = await signal.send(recipient, message);
        console.log(JSON.stringify(result, null, 2));
      } catch (e) {
        if (e.errors.length > 0) {
          log.error(e.errors[0]);
          errorMessage = e.errors[0].message;
        }
      }
      await SignalStore.updateStore(tx, bot.id, signal.getStoreData());
      switch (ctx.accepts("html", "json")) {
        case "html":
          await ctx.render("bot/send", {
            bot,
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
    });
  },
  async receive(ctx) {
    const { token } = ctx.params;
    const bot = await Bot.findBotByToken(ctx.app.db, token);
    if (!bot) throw new NotFoundError();
    const signalStore = await SignalStore.getStore(ctx.app.db, bot.id);
    const signal = new SignalService(bot.number, signalStore.data);
    let errorMessage;
    let messages = [];
    try {
      messages = await signal.receive();
    } catch (e) {
      if (e.errors.length > 0) {
        log.error(e.errors[0]);
        errorMessage = e.errors[0].message;
      }
    }
    await SignalStore.updateStore(ctx.app.db, bot.id, signal.getStoreData());

    switch (ctx.accepts("html", "json")) {
      case "html":
        await ctx.render("bot/receive", {
          bot,
          messages,
          error: errorMessage
        });
        break;
      case "json":
      default:
        ctx.body = {
          messages,
          bot
        };
        break;
    }
  }
};
export default bots;
