// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const { db, nextId } = require('../db/database');
const router  = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register');
});

router.post('/register', async (req, res) => {
  const { name, email, password, confirm } = req.body;
  if (!name || !email || !password) { req.flash('error','All fields required.'); return res.redirect('/register'); }
  if (password !== confirm) { req.flash('error','Passwords do not match.'); return res.redirect('/register'); }
  if (password.length < 6) { req.flash('error','Password must be 6+ characters.'); return res.redirect('/register'); }
  const existing = await db.users.findOne({ email });
  if (existing) { req.flash('error','Email already registered.'); return res.redirect('/register'); }
  const id   = await nextId(db.users);
  const hash = bcrypt.hashSync(password, 10);
  await db.users.insert({ id, name, email, password: hash, created_at: new Date().toISOString() });
  await db.activity.insert({ id: await nextId(db.activity), user_id: id, type:'register', message:'Joined SplitEase 🎉', created_at: new Date().toISOString() });
  req.flash('success','Account created! Please login.');
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    req.flash('error','Invalid email or password.');
    return res.redirect('/login');
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  req.flash('success', `Welcome back, ${user.name}!`);
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
