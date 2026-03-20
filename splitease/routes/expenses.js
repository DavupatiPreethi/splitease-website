// routes/expenses.js
const express = require('express');
const { db, nextId } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const { group, category, q } = req.query;
  const mySplits = await db.splits.find({ user_id: uid });
  const myExpIds = [...new Set(mySplits.map(s => s.expense_id))];
  let expenses = myExpIds.length ? await db.expenses.find({ id: { $in: myExpIds } }) : [];
  if (group)    expenses = expenses.filter(e => e.group_id == group);
  if (category) expenses = expenses.filter(e => e.category === category);
  if (q)        expenses = expenses.filter(e => e.description.toLowerCase().includes(q.toLowerCase()));
  expenses.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  const enriched = await Promise.all(expenses.map(async e => {
    const payer  = await db.users.findOne({ id: e.paid_by });
    const grp    = e.group_id ? await db.groups.findOne({ id: e.group_id }) : null;
    const splits = await db.splits.find({ expense_id: e.id });
    const others = splits.filter(s => s.user_id !== e.paid_by);
    const names  = await Promise.all(others.map(async s => { const u = await db.users.findOne({ id: s.user_id }); return u?.name; }));
    return { ...e, payer_name: payer?.name||'Unknown', group_name: grp?.name||null, split_with: names.filter(Boolean).join(', ') };
  }));

  const memberships = await db.groupMembers.find({ user_id: uid });
  const groupIds = memberships.map(m => m.group_id);
  const groups = groupIds.length ? await db.groups.find({ id: { $in: groupIds } }) : [];
  const categories = ['Food','Transport','Stay','Entertainment','Shopping','Medical','Utilities','Education','Other'];
  res.render('expenses/index', { expenses: enriched, groups, categories, filters: { group, category, q } });
});

router.get('/new', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const friendLinks = await db.friends.find({ user_id: uid });
  const friends = (await Promise.all(friendLinks.map(f => db.users.findOne({ id: f.friend_id })))).filter(Boolean);
  const memberships = await db.groupMembers.find({ user_id: uid });
  const groupIds = memberships.map(m => m.group_id);
  const groups = groupIds.length ? await db.groups.find({ id: { $in: groupIds } }) : [];
  const categories = ['Food','Transport','Stay','Entertainment','Shopping','Medical','Utilities','Education','Other'];
  res.render('expenses/new', { friends, groups, categories, preGroup: req.query.group || '' });
});

router.post('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  let { description, amount, paid_by, group_id, category, split_type, date, notes, members, custom_shares } = req.body;
  if (!description || !amount || +amount <= 0) { req.flash('error','Description and valid amount required.'); return res.redirect('/expenses/new'); }
  paid_by  = parseInt(paid_by) || uid;
  group_id = group_id ? parseInt(group_id) : null;
  amount   = parseFloat(amount);

  const eid = await nextId(db.expenses);
  await db.expenses.insert({ id: eid, description, amount, paid_by, group_id, category: category||'Other', split_type: split_type||'equal', date: date||new Date().toISOString().split('T')[0], notes: notes||'', created_at: new Date().toISOString() });

  let participants = members ? (Array.isArray(members) ? members.map(Number) : [Number(members)]) : [];
  if (!participants.includes(paid_by)) participants.push(paid_by);
  if (!participants.includes(uid))     participants.push(uid);
  participants = [...new Set(participants)];

  if (split_type === 'equal') {
    const share = +(amount / participants.length).toFixed(2);
    for (let i = 0; i < participants.length; i++) {
      const s = i === 0 ? +(amount - share * (participants.length - 1)).toFixed(2) : share;
      await db.splits.insert({ id: await nextId(db.splits), expense_id: eid, user_id: participants[i], share: s, paid: 0 });
    }
  } else {
    const shares = Array.isArray(custom_shares) ? custom_shares : [custom_shares];
    for (let i = 0; i < participants.length; i++) {
      const s = parseFloat(shares[i]) || 0;
      await db.splits.insert({ id: await nextId(db.splits), expense_id: eid, user_id: participants[i], share: s, paid: 0 });
    }
  }

  await db.activity.insert({ id: await nextId(db.activity), user_id: uid, type:'expense', message:`Added expense "${description}" for ₹${amount.toFixed(2)}`, created_at: new Date().toISOString() });
  req.flash('success','Expense added!');
  res.redirect('/expenses');
});

router.get('/:id', requireLogin, async (req, res) => {
  const eid = parseInt(req.params.id);
  const uid = req.session.user.id;
  const expense = await db.expenses.findOne({ id: eid });
  if (!expense) return res.redirect('/expenses');
  const payer  = await db.users.findOne({ id: expense.paid_by });
  const grp    = expense.group_id ? await db.groups.findOne({ id: expense.group_id }) : null;
  const rawSplits = await db.splits.find({ expense_id: eid });
  const splits = await Promise.all(rawSplits.map(async s => {
    const u = await db.users.findOne({ id: s.user_id });
    return { ...s, user_name: u?.name || 'Unknown' };
  }));
  res.render('expenses/show', { expense: { ...expense, payer_name: payer?.name, group_name: grp?.name }, splits, uid });
});

router.post('/:id/delete', requireLogin, async (req, res) => {
  const eid = parseInt(req.params.id);
  const uid = req.session.user.id;
  const exp = await db.expenses.findOne({ id: eid });
  if (!exp) return res.redirect('/expenses');
  await db.expenses.remove({ id: eid }, {});
  await db.splits.remove({ expense_id: eid }, { multi: true });
  await db.activity.insert({ id: await nextId(db.activity), user_id: uid, type:'delete', message:`Deleted expense "${exp.description}"`, created_at: new Date().toISOString() });
  req.flash('success','Expense deleted.');
  res.redirect('/expenses');
});

module.exports = router;
