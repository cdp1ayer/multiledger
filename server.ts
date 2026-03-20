import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './src/db/index.js';

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to authenticate
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || typeof decoded.id !== 'number') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    // Verify user still exists in database
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);
    
    // Create default categories for user
    const insertCat = db.prepare('INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)');
    insertCat.run(info.lastInsertRowid, 'Salary', 'income');
    insertCat.run(info.lastInsertRowid, 'Food', 'expense');
    insertCat.run(info.lastInsertRowid, 'Transport', 'expense');

    res.status(201).json({ message: 'User created' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Categories
app.get('/api/categories', authenticate, (req: any, res) => {
  let categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(req.user.id);
  
  if (categories.length === 0) {
    const insertCat = db.prepare('INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)');
    insertCat.run(req.user.id, 'Salary', 'income');
    insertCat.run(req.user.id, 'Food', 'expense');
    insertCat.run(req.user.id, 'Transport', 'expense');
    categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(req.user.id);
  }
  
  res.json(categories);
});

app.post('/api/categories', authenticate, (req: any, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Missing fields' });
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Invalid type' });
  }
  try {
    const stmt = db.prepare('INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)');
    const info = stmt.run(req.user.id, name, type);
    res.status(201).json({ id: info.lastInsertRowid, name, type });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add category' });
  }
});

app.delete('/api/categories/:id', authenticate, (req: any, res) => {
  try {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?');
    const info = stmt.run(req.params.id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'Cannot delete category in use' });
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Transactions
app.get('/api/transactions', authenticate, (req: any, res) => {
  const transactions = db.prepare(`
    SELECT t.*, c.name as category_name 
    FROM transactions t 
    JOIN categories c ON t.category_id = c.id 
    WHERE t.user_id = ? 
    ORDER BY date DESC, created_at DESC
  `).all(req.user.id);
  res.json(transactions);
});

app.post('/api/transactions', authenticate, (req: any, res) => {
  const { amount, type, category_id, date, note } = req.body;
  if (amount === undefined || isNaN(Number(amount)) || !type || !category_id || !date) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    // Verify category belongs to user
    const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.user.id);
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const stmt = db.prepare('INSERT INTO transactions (user_id, category_id, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(req.user.id, category_id, amount, type, date, note || '');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

app.delete('/api/transactions/:id', authenticate, (req: any, res) => {
  const stmt = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
  const info = stmt.run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export { app }; // Export for testing

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
