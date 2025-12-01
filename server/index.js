// server/index.js
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
let db;
try {
  db = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log("Successfully connected to MySQL database via Docker.");
} catch (error) {
  console.error("!!! FAILED TO CONNECT TO DATABASE !!!");
  console.error("Error:", error.message);
  console.error("Please check your server/.env file and ensure the Docker MySQL container is running.");
  process.exit(1); // Exit the process if we can't connect
}


// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await db.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    res.status(201).json({ message: "User created" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: "An account with this email already exists." });
    }
    // --- THIS IS THE CRUCIAL CHANGE ---
    // Log the full, detailed error to the backend console
    console.error("!!! DATABASE INSERT FAILED !!!", error); 
    // Send a more detailed error back to the frontend
    res.status(500).json({ error: "Error creating user", details: error.message }); 
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) return res.status(400).send('Cannot find user');

  const user = rows[0];
  if (await bcrypt.compare(password, user.password)) {
    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ accessToken: accessToken, user: { id: user.id, email: user.email } });
  } else {
    res.status(401).send('Not Allowed');
  }
});

// --- DATA ROUTES (PROTECTED) ---

// Fetch all user data (brain dumps and goals)
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const [brainDumpRows] = await db.execute('SELECT * FROM brain_dumps WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);    
    const [goalRows] = await db.execute('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);    
    const goalsWithRelations = await Promise.all(goalRows.map(async (goal) => { // Fetch related tasks and updates for each goal
      const [tasks] = await db.execute('SELECT * FROM tasks WHERE goal_id = ?', [goal.id]);
      const [updates] = await db.execute('SELECT * FROM goal_updates WHERE goal_id = ?', [goal.id]);
      return { ...goal, tasks, updates };
    }));
    res.json({ brainDump: brainDumpRows, goals: goalsWithRelations });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send({ error: "Error fetching data" });
  }
});

// --- Brain Dump Endpoints ---
app.post('/api/braindump', authenticateToken, async (req, res) => {
  const { text, done = 0, category, createdAt } = req.body; // MySQL BOOLEAN is 0 or 1
  try {
    const [result] = await db.execute('INSERT INTO brain_dumps (user_id, text, done, category, created_at) VALUES (?, ?, ?, ?, ?)', [req.user.id, text, done, category, createdAt]);
    res.status(201).json({ id: result.insertId, text, done, category, createdAt });
  } catch (error) {
    console.error("Error adding brain dump item:", error);
    res.status(500).send({ error: "Error adding brain dump item" });
  }
});

app.put('/api/braindump/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { text, done = 0, category } = req.body; // MySQL BOOLEAN is 0 or 1
  try {
    const [result] = await db.execute('UPDATE brain_dumps SET text = ?, done = ?, category = ? WHERE id = ? AND user_id = ?', [text, done, category, id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).send('Item not found or not authorized');
    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating brain dump item:", error);
    res.status(500).send({ error: "Error updating brain dump item" });
  }
});

app.delete('/api/braindump/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM brain_dumps WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).send('Item not found or not authorized');
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting brain dump item:", error);
    res.status(500).send({ error: "Error deleting brain dump item" });
  }
});

// --- Goal Endpoints ---
app.post('/api/goals', authenticateToken, async (req, res) => {
  const { title, description, deadline, category, tasks = [], updates = [], createdAt } = req.body;
  try { // Only insert fields present in the goals table
    const [result] = await db.execute(
      'INSERT INTO goals (user_id, title, description, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
      // If deadline is falsy (empty string, null, undefined), use null for SQL.
      [req.user.id, title, description, deadline || null, category, createdAt]
    );
    res.status(201).json({ id: result.insertId, title, description, deadline, category, createdAt });
  } catch (error) {
    console.error("Error adding goal:", error);
    res.status(500).send({ error: "Error adding goal" });
  }
});

app.put('/api/goals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, deadline, category, tasks, updates } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Update the main goal details
    await connection.execute('UPDATE goals SET title = ?, description = ?, deadline = ?, category = ? WHERE id = ? AND user_id = ?', [title, description, deadline, category, id, req.user.id]);
    
    // Handle tasks: delete existing and insert new ones
    await connection.execute('DELETE FROM tasks WHERE goal_id = ?', [id]);
    if (tasks && tasks.length > 0) {
      const taskValues = tasks.map(t => [id, t.text, t.done, t.status || 'todo']);
      await connection.query('INSERT INTO tasks (goal_id, text, done, status) VALUES ?', [taskValues]);
    }

    // Handle updates: delete existing and insert new ones (assuming updates are also replaced entirely)
    await connection.execute('DELETE FROM goal_updates WHERE goal_id = ?', [id]);
    if (updates && updates.length > 0) {
      const updateValues = updates.map(u => [id, u.text]); // Assuming 'text' and 'created_at' for updates
      await connection.query('INSERT INTO goal_updates (goal_id, text) VALUES ?', [updateValues]);
    }

    await connection.commit();
    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).send({ error: "Error updating goal" });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).send('Goal not found or not authorized');
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).send({ error: "Error deleting goal" });
  }
});

// --- Transactional Endpoints ---
app.post('/api/promote-to-goal', authenticateToken, async (req, res) => {
  const { brainDumpItemId, newGoalData } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Add new goal to the 'goals' table
    const [goalResult] = await connection.execute(
      'INSERT INTO goals (user_id, title, description, deadline, category, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
      // If deadline is falsy (empty string, null, undefined), use null for SQL.
      [req.user.id, newGoalData.title, newGoalData.description, newGoalData.deadline || null, newGoalData.category, newGoalData.createdAt]
    );

    // Delete brain dump item
    const [deleteResult] = await connection.execute('DELETE FROM brain_dumps WHERE id = ? AND user_id = ?', [brainDumpItemId, req.user.id]);
    if (deleteResult.affectedRows === 0) throw new Error('Brain dump item not found for deletion');

    await connection.commit();
    res.status(201).json({ newGoalId: goalResult.insertId, ...newGoalData });
  } catch (error) {
    await connection.rollback();
    console.error("Error promoting to goal:", error);
    res.status(500).send({ error: "Failed to promote to goal", details: error.message });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
