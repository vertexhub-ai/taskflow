import { sql } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

export default async function projectRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/api/projects', async (req) => {
    return sql`
      SELECT p.*,
             COUNT(t.id) FILTER (WHERE t.status != 'done') AS open_count,
             COUNT(t.id) FILTER (WHERE t.status = 'done')  AS done_count
      FROM   projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE  p.owner_id = ${req.user.id}
        AND  p.archived = false
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
  });

  fastify.post('/api/projects', async (req, reply) => {
    const { name, description = '' } = req.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'name required' });
    const [project] = await sql`
      INSERT INTO projects (name, description, owner_id)
      VALUES (${name.trim()}, ${description}, ${req.user.id})
      RETURNING *
    `;
    return project;
  });

  fastify.get('/api/projects/:id', async (req, reply) => {
    const [p] = await sql`
      SELECT * FROM projects WHERE id = ${req.params.id} AND owner_id = ${req.user.id}
    `;
    if (!p) return reply.code(404).send({ error: 'Not found' });
    return p;
  });

  fastify.patch('/api/projects/:id', async (req, reply) => {
    const [p] = await sql`
      SELECT id FROM projects WHERE id = ${req.params.id} AND owner_id = ${req.user.id}
    `;
    if (!p) return reply.code(404).send({ error: 'Not found' });

    const { name, description, archived } = req.body ?? {};
    const [updated] = await sql`
      UPDATE projects SET
        name        = COALESCE(${name        ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        archived    = COALESCE(${archived    ?? null}, archived)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    return updated;
  });

  fastify.delete('/api/projects/:id', async (req, reply) => {
    const [p] = await sql`
      DELETE FROM projects WHERE id = ${req.params.id} AND owner_id = ${req.user.id} RETURNING id
    `;
    if (!p) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
