/* eslint-disable no-param-reassign */
import fs from "fs";
import knex from "knex";
import config from "../config";

function middleware(app) {
  if (config.db.client === "sqlite3") {
    try {
      fs.mkdirSync(config.server.data);
    } catch (err) {
      if (err.code !== "EEXIST") {
        throw err;
      }
    }
  }

  const db = knex(config.db);
  app.db = db;
  let promise;

  if (!config.env.isTest) {
    app.migration = true;
    promise = db.migrate.latest().then(() => {
      app.migration = false;
    }, app.logger.error);
  }

  return async (ctx, next) => {
    if (ctx.app.migration && promise) {
      await promise;
    }

    return next();
  };
}

export default middleware;
