import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import passport from "koa-passport";
import R from "ramda";
import User from "../models/user";
import { NotFoundError } from "../errors";
import log from "../logger";

function isPassValid(plaintextPass, user) {
  return bcrypt.compareSync(plaintextPass, user.password);
}

function middleware(app) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findUserById(app.db, id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password", session: true },
      async (email, password, done) => {
        try {
          const user = await User.findUserByEmail(app.db, email);
          if (!user) {
            throw new NotFoundError();
          }
          const credentialsAreAllowed =
            email === user.email && isPassValid(password, user);
          if (credentialsAreAllowed) {
            const sanitizedUser = R.omit(["password"], user);
            done(null, sanitizedUser);
          } else {
            done(null, false);
          }
        } catch (err) {
          log.info("authentication failed for user");
          done(err);
        }
      }
    )
  );

  app.use(passport.initialize());
  app.use(passport.session());

  return async (ctx, next) => next();
}

export default middleware;
