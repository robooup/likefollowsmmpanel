import { platformDb } from '@/lib/tenant/registry';

export async function audit(entry: {
  actorId?: number | null;
  actor?: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await platformDb().saasAuditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actor: entry.actor ?? (entry.actorId ? 'user' : 'system'),
        action: entry.action,
        target: entry.target,
        meta: (entry.meta as any) ?? undefined,
        ip: entry.ip ?? null,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
