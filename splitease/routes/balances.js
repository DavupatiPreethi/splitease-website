// routes/balances.js
const express = require('express');
const { db, nextId } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const friendLinks = await db.friends.find({ user_id: uid });

  const balances = await Promise.all(friendLinks.map(async f => {
    const fUser = await db.users.findOne({ id: f.friend_id });
    if (!fUser) return null;
    const myPaid   = await db.expenses.find({ paid_by: uid });
    const myPaidIds = myPaid.map(e => e.id);
    const theyOweSplits = myPaidIds.length ? await db.splits.find({ expense_id: { $in: myPaidIds }, user_id: f.friend_id, paid: { $ne: 1 } }) : [];
    const theyOwe = theyOweSplits.reduce((s,x) => s+x.share, 0);

    const fPaid   = await db.expenses.find({ paid_by: f.friend_id });
    const fPaidIds = fPaid.map(e => e.id);
    const iOweSplits = fPaidIds.length ? await db.splits.find({ expense_id: { $in: fPaidIds }, user_id: uid, paid: { $ne: 1 } }) : [];
    const iOwe = iOweSplits.reduce((s,x) => s+x.share, 0);

    const net = theyOwe - iOwe;
    if (Math.abs(net) < 0.01) return null;
    return { ...fUser, theyOwe, iOwe, net };
  }));

  const validBalances = balances.filter(Boolean);
  const totalOwed = validBalances.filter(b => b.net > 0).reduce((s,b) => s+b.net, 0);
  const totalIOwe = validBalances.filter(b => b.net < 0).reduce((s,b) => s+Math.abs(b.net), 0);

  const rawHistory = await db.settlements.find({ $or: [{ from_user: uid }, { to_user: uid }] });
  rawHistory.sort((a,b) => new Date(b.settled_at) - new Date(a.settled_at));
  const history = await Promise.all(rawHistory.slice(0,20).map(async h => {
    const from = await db.users.findOne({ id: h.from_user });
    const to   = await db.users.findOne({ id: h.to_user });
    return { ...h, from_name: from?.name||'?', to_name: to?.name||'?' };
  }));

  res.render('balances/index', { balances: validBalances, history, totalOwed, totalIOwe });
});

router.post('/settle', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const { friend_id, amount, note } = req.body;
  const fid = parseInt(friend_id);
  const amt = parseFloat(amount);
  if (!fid || !amt || amt <= 0) { req.flash('error','Invalid settlement.'); return res.redirect('/balances'); }

  // Mark oldest unpaid splits as paid
  const fPaid   = await db.expenses.find({ paid_by: fid });
  const fPaidIds = fPaid.map(e => e.id);
  const splits  = fPaidIds.length ? await db.splits.find({ expense_id: { $in: fPaidIds }, user_id: uid, paid: { $ne: 1 } }) : [];
  splits.sort((a,b) => a.id - b.id);
  let remaining = amt;
  for (const sp of splits) {
    if (remaining <= 0) break;
    await db.splits.update({ _id: sp._id }, { $set: { paid: 1 } }, {});
    remaining -= sp.share;
  }

  await db.settlements.insert({ id: await nextId(db.settlements), from_user: uid, to_user: fid, amount: amt, note: note||'', settled_at: new Date().toISOString() });
  await db.activity.insert({ id: await nextId(db.activity), user_id: uid, type:'settle', message:`Settled ₹${amt.toFixed(2)} with a friend`, created_at: new Date().toISOString() });
  req.flash('success', `Settlement of ₹${amt.toFixed(2)} recorded!`);
  res.redirect('/balances');
});

module.exports = router;
