import type { PrismaClient } from '@prisma/client';
import { getTenantStore, type TenantStore } from '@/lib/tenant/context';
import { requireTenant } from '@/lib/tenant/current';
import { tenantClient } from '@/lib/tenant/registry';

/**
 * Multi-tenant database access.
 *
 * Every panel has its own PostgreSQL database. `db` looks like a normal
 * PrismaClient, but each call is routed to the database of the panel that the
 * current request belongs to (decided by the request host, see server.js and
 * lib/tenant). There is no "default" database: a call made without a panel
 * context fails instead of touching someone else's data.
 *
 * Calls are recorded lazily and executed when awaited, which also keeps
 * `db.$transaction([db.a.create(), db.b.update()])` working.
 */

type Step = { prop: string; args?: unknown[] };
const LAZY = Symbol.for('tc.lazyDbOp');

async function clientFor(store: TenantStore | undefined): Promise<PrismaClient> {
  return tenantClient(await requireTenant(store));
}

function materialize(client: any, steps: Step[]): any {
  let current = client;
  for (const step of steps) {
    const value = current[step.prop];
    current = step.args ? value.apply(current, step.args) : value;
  }
  return current;
}

function lazy(steps: Step[], store: TenantStore | undefined): any {
  let promise: Promise<any> | null = null;
  const called = steps[steps.length - 1]?.args !== undefined;
  const exec = () => (promise ??= clientFor(store).then((client) => materialize(client, steps)));

  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === LAZY) return steps;
      if (called) {
        if (prop === 'then') return (ok?: any, fail?: any) => exec().then(ok, fail);
        if (prop === 'catch') return (fail?: any) => exec().catch(fail);
        if (prop === 'finally') return (fn?: any) => exec().finally(fn);
      }
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined;
      }
      return lazy([...steps, { prop }], store);
    },
    apply(_target, _thisArg, args) {
      const last = steps[steps.length - 1];
      return lazy([...steps.slice(0, -1), { prop: last.prop, args }], store);
    },
  });
}

const root: Record<string, unknown> = {};

export const db = new Proxy(root, {
  get(_target, prop) {
    if (typeof prop === 'symbol' || prop === 'then') return undefined;
    const store = getTenantStore();

    switch (prop) {
      case '$transaction':
        return async (arg: any, options?: any) => {
          const client: any = await clientFor(store);
          if (typeof arg === 'function') return client.$transaction(arg, options);
          const operations = (arg as any[]).map((op) => {
            const steps = op?.[LAZY] as Step[] | undefined;
            return steps ? materialize(client, steps) : op;
          });
          return client.$transaction(operations, options);
        };
      case '$connect':
        return async () => {
          await clientFor(store);
        };
      case '$disconnect':
        // Panel clients are pooled and shared; request code must not close them.
        return async () => {};
      case '$on':
      case '$use':
      case '$extends':
        throw new Error(`db.${prop} is not available on the multi-tenant client`);
      default:
        return lazy([{ prop }], store);
    }
  },
}) as unknown as PrismaClient;
