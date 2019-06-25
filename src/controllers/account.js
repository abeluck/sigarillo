import config from "../config";
import Bot from "../models/bot";
import User from "../models/user";
import log from "../logger";
import R from "ramda";
import zxcvbn from "zxcvbn";

async function loginForm(ctx) {
  const userCount = await User.countUsers(ctx.app.db);
  if (userCount === 0) {
    return await ctx.redirect("/setup");
  }
  await ctx.render("login", {});
}

async function logout(ctx) {
  ctx.logout();
  await ctx.redirect("/");
}

async function index(ctx) {
  const { user } = ctx.state;
  const bots = await Bot.findAllBotsForUser(ctx.app.db, user.id);
  await ctx.render("account", {
    title: config.site.name,
    isProd: config.env.isProd,
    user,
    bots
  });
}

// from https://emailregex.com/
const isEmail = input =>
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    input
  );
const isEmpty = R.either(R.isNil, R.isEmpty);

async function setup(ctx) {
  const userCount = await User.countUsers(ctx.app.db);
  if (userCount !== 0) {
    log.warning("setup page requested, but users already exist.", {
      userCount
    });
    await ctx.redirect("/login");
    return;
  }
  const { email, password, passwordConfirm } = ctx.request.body;
  const passwordStrength = zxcvbn(password);
  let errorMessage;
  let passwordSuggestions;
  let passwordStrengthError;
  let isPasswordStrengthError = false;
  let isPasswordMatchError = false;
  let isEmailAddressError = false;
  let isUserExistsError = false;
  let isEmailValidityError = false;
  let passwordCrackTime;
  if (!isEmail(email)) {
    isEmailAddressError = true;
    isEmailValidityError = true;
  } else {
    const otherUser = await User.findUserByEmail(ctx.app.db, email);
    if (otherUser) {
      isEmailAddressError = true;
      isUserExistsError = true;
    }
  }
  if (password !== passwordConfirm) {
    isPasswordMatchError = true;
  }
  if (passwordStrength.score < 3) {
    isPasswordStrengthError = true;
    console.log(passwordStrength);
    passwordStrengthError = passwordStrength.feedback.warning;
    passwordSuggestions = passwordStrength.feedback.suggestions;
    passwordCrackTime =
      passwordStrength.crack_times_display.offline_slow_hashing_1e4_per_second;
  }
  const isError =
    isPasswordMatchError || isPasswordStrengthError || !isEmpty(errorMessage);
  if (isError) {
    log.info("setup error", {
      isPasswordMatchError,
      isPasswordStrengthError,
      isEmailValidityError,
      isEmailAddressError,
      errorMessage
    });
    return await ctx.render("setup", {
      email,
      errorMessage,
      isEmailAddressError,
      isEmailValidityError,
      isPasswordStrengthError,
      isPasswordMatchError,
      isUserExistsError,
      passwordCrackTime,
      passwordStrengthError,
      passwordSuggestions
    });
  }
  const user = await User.createUser(ctx.app.db, email, password);
  log.info("user created");
  ctx.redirect("/login");
}

async function setupForm(ctx) {
  const userCount = await User.countUsers(ctx.app.db);
  if (userCount === 0) {
    await ctx.render("setup", {});
  } else {
    log.warning("setup form page requested, but users already exist.");
    await ctx.redirect("/login");
  }
}

export default {
  loginForm,
  logout,
  index,
  setupForm,
  setup
};
