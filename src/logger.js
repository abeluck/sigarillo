const l = {
  setLogger(logger) {
    this.logger = logger
    this.log = logger.log
    this.info = logger.info
    this.error = logger.error
    this.warning = logger.warn
    this.warn = logger.warn
    this.debug = logger.debug
    this.trace = logger.trace
    this.silly = logger.silly
  },
}
export default l
