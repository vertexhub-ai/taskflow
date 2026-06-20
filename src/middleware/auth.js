import { sql } from '../db/client.js';

export async function requireAuth(req, reply) {
  const token = req.cookies?.sid;
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  const [row] = await sql`
    SELECT s.user_id, u.email, u.name
    FROM   sessions s
    JOIN   users    u ON u.id = s.user_id
    WHERE  s.token = ${token}
      AND  s.expires_at > now()
  `;
  if (!row) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  req.user = { id: row.user_id, email: row.email, name: row.name };
}
