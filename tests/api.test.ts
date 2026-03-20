import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import db from '../src/db/index.js';

describe('API Tests', () => {
  let token: string;
  let categoryId: number;
  let transactionId: number;

  beforeAll(() => {
    // Clear DB
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM users');
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User created');
  });

  it('should login the user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  it('should get default categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    categoryId = res.body[0].id;
  });

  it('should create a transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 100.5,
        type: 'income',
        category_id: categoryId,
        date: '2023-10-01',
        note: 'Test income'
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    transactionId = res.body.id;
  });

  it('should get transactions', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].amount).toBe(100.5);
  });

  it('should delete a transaction', async () => {
    const res = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
