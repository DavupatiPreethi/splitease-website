// routes/friends.js
const express = require('express');
const { db, nextId } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const friendLinks = await db.friends.find({ user_id: uid });
  const q = (req.query.q || '').trim();

  const friends = await Promise.all(friendLinks.map(async f => {
    const u = await db.users.findOne({ id: f.friend_id });
    if (!u) return null;
    // they_owe: splits on expenses I paid, for them, unpaid
    const myPaid   = await db.expenses.find({ paid_by: uid });
    const myPaidIds = myPaid.map(e => e.id);
    const theyOweSplits = myPaidIds.length ? await db.splits.find({ expense_id: { $in: myPaidIds }, user_id: f.friend_id, paid: { $ne: 1 } }) : [];
    const they_owe = theyOweSplits.reduce((s,x) => s + x.share, 0);
    // you_owe: splits on expenses they paid, for me, unpaid
    const fPaid   = await db.expenses.find({ paid_by: f.friend_id });
    const fPaidIds = fPaid.map(e => e.id);
    const youOweSplits = fPaidIds.length ? await db.splits.find({ expense_id: { $in: fPaidIds }, user_id: uid, paid: { $ne: 1 } }) : [];
    const you_owe = youOweSplits.reduce((s,x) => s + x.share, 0);
    return { ...u, they_owe, you_owe };
  }));
  const validFriends = friends.filter(Boolean);

  // Search users to add
  let searchResults = [];
  if (q.length > 1) {
    const myFriendIds = friendLinks.map(f => f.friend_id);
    myFriendIds.push(uid);
    const allUsers = await db.users.find({});
    searchResults = allUsers.filter(u =>
      !myFriendIds.includes(u.id) &&
      (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 8);
  }

  res.render('friends/index', { friends: validFriends, searchResults, q });
});

router.post('/add/:friendId', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const fid = parseInt(req.params.friendId);
  if (uid === fid) { req.flash('error','Cannot add yourself.'); return res.redirect('/friends'); }
  const fUser = await db.users.findOne({ id: fid });
  if (!fUser) { req.flash('error','User not found.'); return res.redirect('/friends'); }
  const exists = await db.friends.findOne({ user_id: uid, friend_id: fid });
  if (exists) { req.flash('error','Already friends.'); return res.redirect('/friends'); }
  const id1 = await nextId(db.friends);
  await db.friends.insert({ id: id1, user_id: uid, friend_id: fid, created_at: new Date().toISOString() });
  const id2 = await nextId(db.friends);
  await db.friends.insert({ id: id2, user_id: fid, friend_id: uid, created_at: new Date().toISOString() });
  await db.activity.insert({ id: await nextId(db.activity), user_id: uid, type:'friend', message:`Added ${fUser.name} as a friend`, created_at: new Date().toISOString() });
  req.flash('success', `${fUser.name} added!`);
  res.redirect('/friends');
});

router.post('/remove/:friendId', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const fid = parseInt(req.params.friendId);
  await db.friends.remove({ user_id: uid, friend_id: fid }, {});
  await db.friends.remove({ user_id: fid, friend_id: uid }, {});
  req.flash('success','Friend removed.');
  res.redirect('/friends');
});

module.exports = router;
