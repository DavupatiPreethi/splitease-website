# SplitEase — Smart Expense Splitter Website

Full-stack Node.js web application. Uses **NeDB** — a pure JavaScript embedded
database. No Visual Studio, no build tools, no native compilation needed on Windows.

## Requirements
- Node.js v16 or higher (https://nodejs.org)
- That's it! No other software needed.

## Setup & Run

### Step 1 — Install dependencies
```
cd splitease
npm install
```

### Step 2 — Start the server
```
node server.js
```

### Step 3 — Open in browser
```
http://localhost:3000
```

## First Steps
1. Register an account at http://localhost:3000/register
2. Open an incognito window → register a second account
3. Go to Friends → search for the second user → Add Friend
4. Create a Group → Add an Expense → View Balances → Settle Up!

## Database
Data is saved as plain files inside the `db/` folder:
- db/users.db
- db/friends.db
- db/groups.db
- db/group_members.db
- db/expenses.db
- db/expense_splits.db
- db/settlements.db
- db/activity_log.db

These are created automatically on first run. Delete them to start fresh.

## Tech Stack
- Node.js + Express.js (backend)
- NeDB (pure JS file-based database — no build tools needed)
- EJS (HTML templating)
- Chart.js (dashboard charts)
- Vanilla CSS + JavaScript (frontend)
