async function index(ctx) {
  if (ctx.isAuthenticated()) {
    return ctx.redirect('/account')
  }
  return ctx.redirect('/login')
}

export default { index }
