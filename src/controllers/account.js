import config from '../config'
import Bot from '../models/bot'
import log from '../logger'

async function loginForm(ctx) {
  log.info('authed? %s', ctx.isAuthenticated())
  await ctx.render('login', {})
}

async function logout(ctx) {
  ctx.logout()
  await ctx.redirect('/')
}

async function index(ctx) {
  const { user } = ctx.state
  const bots = await Bot.findAllBotsForUser(ctx.app.db, user.id)
  await ctx.render('account', {
    title: config.site.name,
    isProd: config.env.isProd ,
    user,
    bots,
  })
}

export default {
  loginForm, logout, index,
}
