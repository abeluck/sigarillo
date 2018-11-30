import passport from 'koa-passport'
import Router from 'koa-router'
import main from './controllers/main'
import account from './controllers/account'
import bot from './controllers/bot'
import auth from './middleware/require-authentication'

function init(app) {
  const router = new Router()


  // authenticated routes
  router.get('/account', auth, account.index)
  router.get('/bot/register', auth, bot.registerBotForm)
  router.post('/bot/register', auth, bot.registerBot)
  router.get('/bot/verify', auth, bot.verifyForm)
  router.post('/bot/verify', auth, bot.verify)
  router.post('/bot/delete', auth, bot.delete)
  router.post('/bot/cycle', auth, bot.cycle)
  router.get('/bot/:token/send', auth, bot.sendForm)


  // un-authenticated routes
  router.get('/', main.index)
  router.get('/login', account.loginForm)
  router.get('/setup', account.setupForm)
  router.post('/setup', account.setup)
  router.post('/login', passport.authenticate('local', {
    successRedirect: '/account',
    failureRedirect: '/login',
  }))
  router.get('/logout', account.logout)

  router.get('/bot/:token', bot.getSelf)
  router.post('/bot/:token/send', bot.send)
  router.get('/bot/:token/receive', bot.receive)

  app.use(router.routes())
  app.use(router.allowedMethods())
}

export default init
