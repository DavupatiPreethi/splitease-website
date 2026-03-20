// db/database.js
// Uses NeDB — pure JavaScript embedded database, no build tools needed on Windows.
// Data is saved as flat files in the db/ folder.

const Datastore = require('nedb-promises');
const path      = require('path');
const fs        = require('fs');

const DIR = path.join(__dirname);
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function col(name) {
  return Datastore.create({
    filename: path.join(DIR, name + '.db'),
    autoload: true
  });
}

const db = {
  users:       col('users'),
  friends:     col('friends'),
  groups:      col('groups'),
  groupMembers:col('group_members'),
  expenses:    col('expenses'),
  splits:      col('expense_splits'),
  settlements: col('settlements'),
  activity:    col('activity_log'),
};

// Auto-increment: get next integer id for a collection
async function nextId(collection) {
  const all = await collection.find({});
  if (all.length === 0) return 1;
  return Math.max(...all.map(d => d.id || 0)) + 1;
}

module.exports = { db, nextId };
