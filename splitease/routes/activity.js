// routes/activity.js
const express = require('express');
const { db }  = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const uid  = req.session.user.id;
  const logs = await db.activity.find({ user_id: uid });
  logs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  res.render('activity', { logs: logs.slice(0,50) });
});

module.exports = router;
