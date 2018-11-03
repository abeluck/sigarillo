import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import session from 'koa-session'
import sass from 'koa2-sass'
import hbs from 'koa-hbs'
import mount from 'koa-mount'
import serve from 'koa-static'

import config from './config'
import { requestLogger } from './middleware/request-logger'
import db from './middleware/db'
import passport from './middleware/passport'
import errorHandler from './middleware/error-handler'
import routes from './routes'
import helpers from './helpers/handlebars'
import logger from './logger'

logger.setLogger(config.server.logging.logger)

function start() {
  const app = new Koa()
  exports.app = app

  // register handlebar helpers
  helpers()
  app.logger = logger

  app.use(requestLogger(app, config.server.logging.requestLogger))

  // trust proxy
  app.proxy = true

  // app keys for cookie signing ref: https://koajs.com/#app-keys-
  app.keys = config.site.secrets

  // default error handler, renders nice errors
  app.use(errorHandler())

  // sessions stored in cookies
  app.use(session({}, app))

  // initialize database connection
  app.use(db(app))

  // configure passport for authentication
  app.use(passport(app))

  // parse the body of json and form requests and make the available at ctx.request.body
  app.use(bodyParser())

  // compile that sass
  app.use(sass({
    path: `${__dirname}/assets/scss`,
    dest: `${__dirname}/assets/css`,
    debug: true,
    outputStyle: 'compressed',
  }, {
    includePaths: [`${__dirname}/assets/scss`],
  }))

  // serve static assets
  // app.use(serve(`${__dirname}/public`))
  app.use(mount('/assets', serve(`${__dirname}/assets`)))


  // register handlebars templates
  app.use(hbs.middleware({
    viewPath: `${__dirname}/views`,
    layoutsPath: `${__dirname}/views/layouts`,
    partialsPath: `${__dirname}/views/partials`,
    defaultLayout: 'main',
  }))

  // configure routes
  routes(app)

  // eslint-disable-next-line no-console
  console.log(`      _                   _ ____        _       
  ___(_) __ _ _ __   __ _| | __ )  ___ | |_ ___ 
 / __| |/ _\` | '_ \\ / _\` | |  _ \\ / _ \\| __/ __|
 \\__ \\ | (_| | | | | (_| | | |_) | (_) | |_\\__ \\
 |___/_|\\__, |_| |_|\\__,_|_|____/ \\___/ \\__|___/
        |___/                                   

`)
  app.logger.info(`${config.site.name} is now listening on port ${config.server.port}`)
  app.listen(config.server.port)
}

// noinspection JSUnusedGlobalSymbols
export default start
