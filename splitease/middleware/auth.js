// middleware/auth.js
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Please login to continue.');
  res.redirect('/login');
}

module.exports = { requireLogin };
