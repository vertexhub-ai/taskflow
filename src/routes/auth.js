import { randomBytes } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { sql } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const COOKIE_OPTS = { httpOnly: true, path: '/', sameSite: 'lax', maxAge: 30 * 86400 };

export default async function authRoutes(fastify) {
  fastify.post('/api/auth/signup', async (req, reply) => {
    const { email, password, name = '' } = req.body ?? {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password required' });
    }

    let user;
    try {
      const passwordHash = await hash(password, 12);
      [user] = await sql`
        INSERT INTO users (email, password_hash, name)
        VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name})
        RETURNING id, email, name
      `;
    } catch (e) {
      if (e.code === '23505') {
        return reply.code(409).send({ error: 'Email already registered' });
      }
      throw e;
    }

    const token = randomBytes(32).toString('hex');
    await sql`INSERT INTO sessions (token, user_id) VALUES (${token}, ${user.id})`;
    reply.setCookie('sid', token, COOKIE_OPTS);
    return { user };
  });

  fastify.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password required' });
    }

    const [user] = await sql`
      SELECT id, email, name, password_hash FROM users WHERE email = ${email.toLowerCase().trim()}
    `;
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });

    const ok = await compare(password, user.password_hash);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    const token = randomBytes(32).toString('hex');
    await sql`INSERT INTO sessions (token, user_id) VALUES (${token}, ${user.id})`;
    reply.setCookie('sid', token, COOKIE_OPTS);
    return { user: { id: user.id, email: user.email, name: user.name } };
  });

  fastify.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies?.sid;
    if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
    reply.clearCookie('sid', { path: '/' });
    return { ok: true };
  });

  fastify.get('/api/auth/me', { preHandler: requireAuth }, async (req) => {
    return { user: req.user };
  });
}
