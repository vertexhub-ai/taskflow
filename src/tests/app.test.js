import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';

let app;

beforeAll(async () => {
  // SMOKE_MODE so no real DB required during CI
  process.env.SMOKE_MODE = '1';
  process.env.DATABASE_URL = 'postgres://localhost/test_unused';
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('home page', () => {
  it('GET / returns 200 with HTML', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('auth — unauthenticated guard', () => {
  it('GET /api/auth/me returns 401 when no session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/projects returns 401 when no session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(res.statusCode).toBe(401);
  });
});
