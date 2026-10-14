
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

app.use(express.json());

const db = new Database('laundry.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerName TEXT NOT NULL,
    loadCount INTEGER NOT NULL,
    status TEXT NOT NULL,
    dropOffTime TEXT NOT NULL
  )
`);

// GET all orders
app.get('/orders', (req, res, next) => {
  try {
    const orders = db.prepare('SELECT * FROM orders').all();
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET one order
app.get('/orders/:id', (req, res, next) => {
  try {
    const order = db.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).get(req.params.id);

    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST a new order
app.post('/orders', (req, res, next) => {
  try {
    const { customerName, loadCount, status, dropOffTime } = req.body;

    if (typeof customerName !== 'string' || !customerName.trim()) {
      const err = new Error('Customer name cannot be blank.');
      err.statusCode = 400;
      throw err;
    }

    if (
      typeof loadCount !== 'number' ||
      !Number.isInteger(loadCount) ||
      loadCount <= 0
    ) {
      const err = new Error('loadCount must be a positive integer.');
      err.statusCode = 400;
      throw err;
    }

    if (
      typeof status !== 'string' ||
      !['Pending', 'Washing', 'Ready for Pickup'].includes(status)
    ) {
      const err = new Error('Invalid order status.');
      err.statusCode = 400;
      throw err;
    }

    if (typeof dropOffTime !== 'string' || !dropOffTime.trim()) {
      const err = new Error('dropOffTime is required.');
      err.statusCode = 400;
      throw err;
    }

    const result = db.prepare(`
      INSERT INTO orders (customerName, loadCount, status, dropOffTime)
      VALUES (?, ?, ?, ?)
    `).run(customerName.trim(), loadCount, status, dropOffTime);

    const newOrder = db.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json(newOrder);
  } catch (err) {
    if (!err.statusCode) err.statusCode = 400;
    next(err);
  }
});

// PUT update order status
app.put('/orders/:id', (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Washing', 'Ready for Pickup'];

    if (!validStatuses.includes(status)) {
      const err = new Error('Invalid order status.');
      err.statusCode = 400;
      throw err;
    }

    const result = db.prepare(
      'UPDATE orders SET status = ? WHERE id = ?'
    ).run(status, req.params.id);

    if (result.changes === 0) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const updatedOrder = db.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).get(req.params.id);

    res.json(updatedOrder);
  } catch (err) {
    next(err);
  }
});

// DELETE an order
app.delete('/orders/:id', (req, res, next) => {
  try {
    const order = db.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).get(req.params.id);

    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    db.prepare(
      'DELETE FROM orders WHERE id = ?'
    ).run(req.params.id);

    res.json({
      message: 'Order deleted successfully.',
      deletedOrder: order
    });
  } catch (err) {
    next(err);
  }
});

// GLOBAL ERROR HANDLER
// Must be after all routes and have four parameters.
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);

  res.status(err.statusCode || 500).json({
    error: err.message || 'Something went wrong on our end.'
  });
});

// Handle requests to unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.'
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
