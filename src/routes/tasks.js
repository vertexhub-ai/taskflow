import { sql } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

async function ownedProject(projectId, userId, reply) {
  const [p] = await sql`
    SELECT id FROM projects WHERE id = ${projectId} AND owner_id = ${userId}
  `;
  if (!p) { reply.code(404).send({ error: 'Project not found' }); return null; }
  return p;
}

async function recordActivity(projectId, actorId, action, entityType, entityId, detail) {
  await sql`
    INSERT INTO activity (project_id, actor_id, action, entity_type, entity_id, detail)
    VALUES (${projectId}, ${actorId}, ${action}, ${entityType}, ${entityId}, ${JSON.stringify(detail)})
  `;
}

export default async function taskRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/api/projects/:projectId/tasks', async (req, reply) => {
    const p = await ownedProject(req.params.projectId, req.user.id, reply);
    if (!p) return;

    const { status, assignee_id, sort = 'created_at' } = req.query;
    const sortCol = ['created_at', 'updated_at', 'due_date', 'priority'].includes(sort)
      ? sort : 'created_at';

    const rows = await sql`
      SELECT t.*,
             u.name AS assignee_name,
             u.email AS assignee_email
      FROM   tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE  t.project_id = ${p.id}
        ${status      ? sql`AND t.status      = ${status}`                : sql``}
        ${assignee_id ? sql`AND t.assignee_id = ${Number(assignee_id)}`   : sql``}
      ORDER BY
        CASE WHEN ${sortCol} = 'priority'
          THEN CASE t.priority WHEN 'high' THEN 0 WHEN 'med' THEN 1 ELSE 2 END
        END ASC NULLS LAST,
        CASE WHEN ${sortCol} = 'due_date'   THEN t.due_date    END ASC NULLS LAST,
        CASE WHEN ${sortCol} = 'updated_at' THEN t.updated_at  END DESC,
        t.created_at DESC
    `;
    return rows;
  });

  fastify.post('/api/projects/:projectId/tasks', async (req, reply) => {
    const p = await ownedProject(req.params.projectId, req.user.id, reply);
    if (!p) return;

    const { title, description = '', status = 'todo', priority = 'med', assignee_id, due_date } = req.body ?? {};
    if (!title?.trim()) return reply.code(400).send({ error: 'title required' });

    const [task] = await sql`
      INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date)
      VALUES (
        ${p.id}, ${title.trim()}, ${description},
        ${status}, ${priority},
        ${assignee_id ?? null},
        ${due_date ?? null}
      )
      RETURNING *
    `;
    await recordActivity(p.id, req.user.id, 'created', 'task', task.id, { title: task.title });
    return task;
  });

  fastify.get('/api/projects/:projectId/tasks/:id', async (req, reply) => {
    const p = await ownedProject(req.params.projectId, req.user.id, reply);
    if (!p) return;

    const [task] = await sql`
      SELECT t.*, u.name AS assignee_name, u.email AS assignee_email
      FROM   tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE  t.id = ${req.params.id} AND t.project_id = ${p.id}
    `;
    if (!task) return reply.code(404).send({ error: 'Not found' });
    return task;
  });

  fastify.patch('/api/projects/:projectId/tasks/:id', async (req, reply) => {
    const p = await ownedProject(req.params.projectId, req.user.id, reply);
    if (!p) return;

    const { title, description, status, priority, assignee_id, due_date } = req.body ?? {};

    const [task] = await sql`
      UPDATE tasks SET
        title       = COALESCE(${title       ?? null}, title),
        description = COALESCE(${description ?? null}, description),
        status      = COALESCE(${status      ?? null}, status),
        priority    = COALESCE(${priority    ?? null}, priority),
        assignee_id = CASE WHEN ${'assignee_id' in (req.body ?? {})} THEN ${assignee_id ?? null} ELSE assignee_id END,
        due_date    = CASE WHEN ${'due_date'    in (req.body ?? {})} THEN ${due_date    ?? null} ELSE due_date    END,
        updated_at  = now()
      WHERE id = ${req.params.id} AND project_id = ${p.id}
      RETURNING *
    `;
    if (!task) return reply.code(404).send({ error: 'Not found' });

    if (status) {
      await recordActivity(p.id, req.user.id, 'status_changed', 'task', task.id, { title: task.title, status });
    }
    return task;
  });

  fastify.delete('/api/projects/:projectId/tasks/:id', async (req, reply) => {
    const p = await ownedProject(req.params.projectId, req.user.id, reply);
    if (!p) return;

    const [task] = await sql`
      DELETE FROM tasks WHERE id = ${req.params.id} AND project_id = ${p.id} RETURNING id, title
    `;
    if (!task) return reply.code(404).send({ error: 'Not found' });
    await recordActivity(p.id, req.user.id, 'deleted', 'task', task.id, { title: task.title });
    return { ok: true };
  });

  // Board view — tasks grouped by status column
  fastify.get('/api/projects/:projectId/board', async (req, reply) => {
    const p = await ownedProject(req.params.projectId, req.user.id, reply);
    if (!p) return;

    const tasks = await sql`
      SELECT t.*, u.name AS assignee_name
      FROM   tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE  t.project_id = ${p.id}
      ORDER BY t.priority DESC, t.created_at ASC
    `;

    return {
      todo:  tasks.filter(t => t.status === 'todo'),
      doing: tasks.filter(t => t.status === 'doing'),
      done:  tasks.filter(t => t.status === 'done'),
    };
  });
}
