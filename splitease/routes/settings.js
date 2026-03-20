// routes/settings.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const { db }  = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const user = await db.users.findOne({ id: req.session.user.id });
  res.render('settings', { user });
});

router.post('/profile', requireLogin, async (req, res) => {
  const { name, email } = req.body;
  const uid = req.session.user.id;
  if (!name || !email) { req.flash('error','Name and email required.'); return res.redirect('/settings'); }
  const conflict = await db.users.findOne({ email });
  if (conflict && conflict.id !== uid) { req.flash('error','Email already in use.'); return res.redirect('/settings'); }
  await db.users.update({ id: uid }, { $set: { name, email } }, {});
  req.session.user.name  = name;
  req.session.user.email = email;
  req.flash('success','Profile updated!');
  res.redirect('/settings');
});

router.post('/password', requireLogin, async (req, res) => {
  const { current, newpass, confirm } = req.body;
  const uid  = req.session.user.id;
  const user = await db.users.findOne({ id: uid });
  if (!bcrypt.compareSync(current, user.password)) { req.flash('error','Current password wrong.'); return res.redirect('/settings'); }
  if (newpass !== confirm) { req.flash('error','New passwords do not match.'); return res.redirect('/settings'); }
  if (newpass.length < 6) { req.flash('error','Password must be 6+ characters.'); return res.redirect('/settings'); }
  await db.users.update({ id: uid }, { $set: { password: bcrypt.hashSync(newpass, 10) } }, {});
  req.flash('success','Password changed!');
  res.redirect('/settings');
});

module.exports = router;
