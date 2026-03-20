// server.js — Main Express server
const express        = require('express');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const path           = require('path');

const app = express();

// ── View engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'splitease-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

app.use(flash());

// Make flash & user available in all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  res.locals.user    = req.session.user || null;
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/',           require('./routes/auth'));
app.use('/dashboard',  require('./routes/dashboard'));
app.use('/friends',    require('./routes/friends'));
app.use('/groups',     require('./routes/groups'));
app.use('/expenses',   require('./routes/expenses'));
app.use('/balances',   require('./routes/balances'));
app.use('/activity',   require('./routes/activity'));
app.use('/settings',   require('./routes/settings'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', { code: 404, message: 'Page not found' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 SplitEase is running at http://localhost:${PORT}\n`);
});
