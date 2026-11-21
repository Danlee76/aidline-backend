import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Db } from '../src/db/pool.js';
import { resetDb, setupApp } from './helpers.js';

const { app, db, config } = (await setupApp()) as {
  app: FastifyInstance;
  db: Db;
  config: ReturnType<typeof loadConfig>;
};

const downDb = {
  query: async () => {
    throw new Error('database is down');
  },
} as unknown as Db;

beforeEach(async () => {
  await resetDb(db);
  await db.query(
    `INSERT INTO indexer_state (id, last_ledger, latest_ledger, updated_at)
     VALUES (1, 100, 110, now())`,
  );
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe('liveness and readiness', () => {
  it('GET /live reports the process is up without touching the database', async () => {
    const offline = await buildApp(config, downDb, { logger: false });
    const res = await offline.inject({ url: '/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await offline.close();
  });

  it('GET /ready succeeds when the database is reachable and the indexer is recent', async () => {
    const res = await app.inject({ url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ready: true, checks: { database: 'ok', indexer: 'ok' } });
  });

  it('GET /ready fails when the database is down', async () => {
    const offline = await buildApp(config, downDb, { logger: false });
    const res = await offline.inject({ url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ ready: false, checks: { database: 'unavailable' } });
    await offline.close();
  });

  it('GET /ready fails when the indexer has not synced recently', async () => {
    await db.query(`UPDATE indexer_state SET updated_at = now() - interval '2 hours' WHERE id = 1`);
    const res = await app.inject({ url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ ready: false, checks: { indexer: 'stale' } });
  });

  it('GET /ready fails when the indexer has never synced', async () => {
    await db.query('DELETE FROM indexer_state');
    const res = await app.inject({ url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ ready: false, checks: { indexer: 'not_synced' } });
  });

  it('GET /ready skips the indexer check when the indexer is disabled', async () => {
    const apiOnly = await buildApp({ ...config, INDEXER_ENABLED: false }, db, { logger: false });
    await db.query('DELETE FROM indexer_state');
    const res = await apiOnly.inject({ url: '/ready' });
    expect(res.statusCode).toBe(200);
    await apiOnly.close();
  });

  it('reports fresh sync age and staleness in health and metrics', async () => {
    const res = await app.inject({ url: '/health' });
    expect(res.json()).toMatchObject({ stale: false });
    expect(res.json().lastSyncedAt).toEqual(expect.any(String));
    expect(res.json().secondsSinceSync).toBeGreaterThanOrEqual(0);
    const metrics = await app.inject({ url: '/metrics' });
    if (metrics.statusCode === 200) {
      expect(metrics.body).toContain('aidline_indexer_seconds_since_sync');
    }
  });

  it('reports stale sync even if ledger lag remains zero', async () => {
    await db.query("UPDATE indexer_state SET latest_ledger = last_ledger, updated_at = now() - interval '2 hours' WHERE id = 1");
    const res = await app.inject({ url: '/health' });
    expect(res.json()).toMatchObject({ lagLedgers: 0, stale: true });
    expect(res.json().secondsSinceSync).toBeGreaterThanOrEqual(7200);
  });

  it('reports never synced as stale', async () => {
    await db.query('DELETE FROM indexer_state');
    const res = await app.inject({ url: '/health' });
    expect(res.json()).toMatchObject({ lastSyncedAt: null, secondsSinceSync: null, stale: true });
  });

  it('keeps GET /health for compatibility', async () => {
    const res = await app.inject({ url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      indexedLedger: 100,
      latestLedger: 110,
      lagLedgers: 10,
    });
  });
});
