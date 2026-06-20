import { sql } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

export default async function dashboardRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/api/projects/:id/dashboard', async (req, reply) => {
    const [project] = await sql`
      SELECT id, name FROM projects WHERE id = ${req.params.id} AND owner_id = ${req.user.id}
    `;
    if (!project) return reply.code(404).send({ error: 'Not found' });

    const pid = project.id;

    const [counts] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status != 'done')                         AS open_count,
        COUNT(*) FILTER (WHERE status = 'done')                         AS done_count,
        COUNT(*) FILTER (WHERE status = 'todo')                         AS todo_count,
        COUNT(*) FILTER (WHERE status = 'doing')                        AS doing_count,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'done') AS overdue_count,
        COUNT(*) FILTER (WHERE priority = 'high' AND status != 'done')  AS high_priority_open
      FROM tasks
      WHERE project_id = ${pid}
    `;

    const activity = await sql`
      SELECT a.*, u.name AS actor_name
      FROM   activity a
      LEFT JOIN users u ON u.id = a.actor_id
      WHERE  a.project_id = ${pid}
      ORDER  BY a.created_at DESC
      LIMIT  20
    `;

    return {
      project,
      counts: {
        open:         Number(counts.open_count),
        done:         Number(counts.done_count),
        todo:         Number(counts.todo_count),
        doing:        Number(counts.doing_count),
        overdue:      Number(counts.overdue_count),
        high_priority: Number(counts.high_priority_open),
      },
      recent_activity: activity,
    };
  });
}
