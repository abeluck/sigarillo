import BotFactory from "../lib/botFactory";

const factoryWrapper = (db, filePath) => {
  const botFactory = new BotFactory(db, filePath);

  return async (ctx, next) => {
    ctx.state.botFactory = botFactory;
    await next();
  };
};

export default factoryWrapper;
