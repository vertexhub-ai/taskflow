import { sql } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

async function ownedTask(taskId, userId, reply) {
  const [task] = await sql`
    SELECT t.id, t.project_id
    FROM   tasks t
    JOIN   projects p ON p.id = t.project_id
    WHERE  t.id = ${taskId} AND p.owner_id = ${userId}
  `;
  if (!task) { reply.code(404).send({ error: 'Task not found' }); return null; }
  return task;
}

export default async function commentRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/api/tasks/:taskId/comments', async (req, reply) => {
    const task = await ownedTask(req.params.taskId, req.user.id, reply);
    if (!task) return;

    return sql`
      SELECT c.*, u.name AS author_name, u.email AS author_email
      FROM   comments c
      JOIN   users    u ON u.id = c.author_id
      WHERE  c.task_id = ${task.id}
      ORDER  BY c.created_at ASC
    `;
  });

  fastify.post('/api/tasks/:taskId/comments', async (req, reply) => {
    const task = await ownedTask(req.params.taskId, req.user.id, reply);
    if (!task) return;

    const { body } = req.body ?? {};
    if (!body?.trim()) return reply.code(400).send({ error: 'body required' });

    const [comment] = await sql`
      INSERT INTO comments (task_id, author_id, body)
      VALUES (${task.id}, ${req.user.id}, ${body.trim()})
      RETURNING *
    `;

    await sql`
      INSERT INTO activity (project_id, actor_id, action, entity_type, entity_id, detail)
      VALUES (${task.project_id}, ${req.user.id}, 'commented', 'task', ${task.id}, ${JSON.stringify({ comment_id: comment.id })})
    `;

    return { ...comment, author_name: req.user.name, author_email: req.user.email };
  });

  fastify.delete('/api/tasks/:taskId/comments/:id', async (req, reply) => {
    const task = await ownedTask(req.params.taskId, req.user.id, reply);
    if (!task) return;

    const [c] = await sql`
      DELETE FROM comments
      WHERE  id = ${req.params.id}
        AND  task_id = ${task.id}
        AND  author_id = ${req.user.id}
      RETURNING id
    `;
    if (!c) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
