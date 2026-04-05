# 💸 SplitEase — Smart Expense Splitter

A full-stack expense management web application that simplifies splitting and tracking shared expenses among users. Built using Node.js and Express with a lightweight embedded database (NeDB), requiring zero external setup.

---
🌐 Live Demo: https://splitease-website.onrender.com

## 🚀 Key Highlights

* ⚡ No external database setup (uses file-based NeDB)
* 🧩 Modular backend architecture (routes, middleware)
* 📊 Real-time expense tracking and balance calculation
* 👥 Group-based expense management system
* 📈 Interactive dashboard with charts

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** NeDB (embedded file-based DB)
* **Frontend:** EJS, HTML, CSS, JavaScript
* **Charts:** Chart.js

---

## 📂 Project Structure

```bash
splitease/
│── db/              # Database files (auto-generated)
│── middleware/      # Custom middleware
│── routes/          # API routes
│── views/           # EJS templates
│── public/          # Static assets
│── server.js        # Entry point
```

---

## ⚙️ Requirements

* Node.js v16 or higher → https://nodejs.org

No additional tools or database setup required.

---

## 🚀 Getting Started

### 1️⃣ Install dependencies

```bash
cd splitease
npm install
```

### 2️⃣ Start the server

```bash
node server.js
```

### 3️⃣ Open in browser

```
http://localhost:3000
```

---

## 🧪 How to Use

1. Register a new account
2. Open another browser/incognito → create second account
3. Add friend via search
4. Create a group
5. Add expenses
6. View balances and settle payments

---

## 🗄️ Database Details

All data is stored locally as files inside the `db/` folder:

* users.db
* friends.db
* groups.db
* group_members.db
* expenses.db
* expense_splits.db
* settlements.db
* activity_log.db

📌 Files are auto-created on first run
📌 Delete them to reset the application

---

## 📸 Screenshots

(Add UI screenshots here — highly recommended)

---

## 🔮 Future Enhancements

* 🔐 Authentication using JWT
* 🌐 Deployment (Render / Railway)
* 📱 Responsive UI design
* 📊 Advanced analytics dashboard

---

## 👩‍💻 Author

**Preethi Davupati**
