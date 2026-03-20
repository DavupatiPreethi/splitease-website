// routes/dashboard.js
const express = require('express');
const { db }  = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;

  // All expenses where user is a split member
  const mySplits   = await db.splits.find({ user_id: uid });
  const myExpIds   = [...new Set(mySplits.map(s => s.expense_id))];
  const allExp     = myExpIds.length ? await db.expenses.find({ id: { $in: myExpIds } }) : [];

  // Total paid by user
  const myPaidExp  = await db.expenses.find({ paid_by: uid });
  const totalPaid  = myPaidExp.reduce((s, e) => s + e.amount, 0);

  // You owe = your splits on expenses YOU did not pay, unpaid
  let youOwe = 0;
  for (const sp of mySplits) {
    const exp = allExp.find(e => e.id === sp.expense_id);
    if (exp && exp.paid_by !== uid && !sp.paid) youOwe += sp.share;
  }

  // Owed to you = others' splits on expenses YOU paid, unpaid
  const paidExpIds = myPaidExp.map(e => e.id);
  const otherSplits = paidExpIds.length
    ? await db.splits.find({ expense_id: { $in: paidExpIds }, user_id: { $ne: uid }, paid: { $ne: 1 } })
    : [];
  const owedToYou = otherSplits.reduce((s, sp) => s + sp.share, 0);

  // Friends & groups count
  const friendCount = (await db.friends.find({ user_id: uid })).length;
  const groupCount  = (await db.groupMembers.find({ user_id: uid })).length;

  // Recent 6 expenses
  const recentRaw = allExp.sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,6);
  const recentExpenses = await Promise.all(recentRaw.map(async e => {
    const payer = await db.users.findOne({ id: e.paid_by });
    return { ...e, payer_name: payer?.name || 'Unknown' };
  }));

  // Monthly spending (last 6 months)
  const now = new Date();
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const monthSplits = mySplits.filter(sp => {
      const exp = allExp.find(e => e.id === sp.expense_id);
      return exp && exp.date && exp.date.startsWith(label);
    });
    const total = monthSplits.reduce((s, sp) => s + sp.share, 0);
    monthly.push({ month: label, total });
  }

  // Category breakdown
  const catMap = {};
  for (const sp of mySplits) {
    const exp = allExp.find(e => e.id === sp.expense_id);
    if (!exp) continue;
    catMap[exp.category] = (catMap[exp.category] || 0) + sp.share;
  }
  const categories = Object.entries(catMap).map(([category, total]) => ({ category, total })).sort((a,b) => b.total-a.total).slice(0,6);

  // Top debts
  const friends = await db.friends.find({ user_id: uid });
  const topDebts = [];
  for (const f of friends) {
    const fSplits = paidExpIds.length ? await db.splits.find({ expense_id: { $in: paidExpIds }, user_id: f.friend_id, paid: { $ne: 1 } }) : [];
    const theyOwe = fSplits.reduce((s, sp) => s + sp.share, 0);
    const fPaid   = await db.expenses.find({ paid_by: f.friend_id });
    const fPaidIds = fPaid.map(e => e.id);
    const iOweSplits = fPaidIds.length ? await db.splits.find({ expense_id: { $in: fPaidIds }, user_id: uid, paid: { $ne: 1 } }) : [];
    const iOwe = iOweSplits.reduce((s, sp) => s + sp.share, 0);
    const net = theyOwe - iOwe;
    if (Math.abs(net) > 0.01) {
      const fUser = await db.users.findOne({ id: f.friend_id });
      topDebts.push({ id: f.friend_id, name: fUser?.name || 'Unknown', net });
    }
  }
  topDebts.sort((a,b) => Math.abs(b.net) - Math.abs(a.net));

  res.render('dashboard', {
    totalPaid, youOwe, owedToYou, friendCount, groupCount,
    recentExpenses, monthly, categories,
    topDebts: topDebts.slice(0,5),
    netBalance: owedToYou - youOwe
  });
});

module.exports = router;
