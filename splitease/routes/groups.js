// routes/groups.js
const express = require('express');
const { db, nextId } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const memberships = await db.groupMembers.find({ user_id: uid });
  const groupIds = memberships.map(m => m.group_id);
  const rawGroups = groupIds.length ? await db.groups.find({ id: { $in: groupIds } }) : [];
  const groups = await Promise.all(rawGroups.map(async g => {
    const members = await db.groupMembers.find({ group_id: g.id });
    const expenses = await db.expenses.find({ group_id: g.id });
    const creator = await db.users.findOne({ id: g.created_by });
    const total_spent = expenses.reduce((s,e) => s + e.amount, 0);
    return { ...g, member_count: members.length, total_spent, creator_name: creator?.name };
  }));
  groups.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  res.render('groups/index', { groups });
});

router.get('/new', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const friendLinks = await db.friends.find({ user_id: uid });
  const friends = await Promise.all(friendLinks.map(f => db.users.findOne({ id: f.friend_id })));
  res.render('groups/new', { friends: friends.filter(Boolean) });
});

router.post('/', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  let { name, description, icon, members } = req.body;
  if (!name) { req.flash('error','Group name required.'); return res.redirect('/groups/new'); }
  const gid = await nextId(db.groups);
  await db.groups.insert({ id: gid, name, description: description||'', icon: icon||'👥', created_by: uid, created_at: new Date().toISOString() });
  await db.groupMembers.insert({ id: await nextId(db.groupMembers), group_id: gid, user_id: uid, joined_at: new Date().toISOString() });
  if (members) {
    const list = Array.isArray(members) ? members : [members];
    for (const mid of list) {
      const m = parseInt(mid);
      if (m !== uid) {
        const exists = await db.groupMembers.findOne({ group_id: gid, user_id: m });
        if (!exists) await db.groupMembers.insert({ id: await nextId(db.groupMembers), group_id: gid, user_id: m, joined_at: new Date().toISOString() });
      }
    }
  }
  await db.activity.insert({ id: await nextId(db.activity), user_id: uid, type:'group', message:`Created group "${name}"`, created_at: new Date().toISOString() });
  req.flash('success', `Group "${name}" created!`);
  res.redirect('/groups');
});

router.get('/:id', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const gid = parseInt(req.params.id);
  const group = await db.groups.findOne({ id: gid });
  if (!group) return res.redirect('/groups');
  const isMember = await db.groupMembers.findOne({ group_id: gid, user_id: uid });
  if (!isMember) { req.flash('error','Not a member.'); return res.redirect('/groups'); }
  const memberLinks = await db.groupMembers.find({ group_id: gid });
  const members = await Promise.all(memberLinks.map(m => db.users.findOne({ id: m.user_id })));
  const rawExp  = await db.expenses.find({ group_id: gid });
  const expenses = await Promise.all(rawExp.map(async e => {
    const payer = await db.users.findOne({ id: e.paid_by });
    return { ...e, payer_name: payer?.name || 'Unknown' };
  }));
  expenses.sort((a,b) => new Date(b.date) - new Date(a.date));
  res.render('groups/show', { group, members: members.filter(Boolean), expenses, uid });
});

router.post('/:id/delete', requireLogin, async (req, res) => {
  const uid = req.session.user.id;
  const gid = parseInt(req.params.id);
  const group = await db.groups.findOne({ id: gid, created_by: uid });
  if (!group) { req.flash('error','Not authorized.'); return res.redirect('/groups'); }
  await db.groups.remove({ id: gid }, {});
  await db.groupMembers.remove({ group_id: gid }, { multi: true });
  req.flash('success','Group deleted.');
  res.redirect('/groups');
});

module.exports = router;
