
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import { appRouter } from './routers.ts';
import type { Context } from './core/trpc.ts';
import { getDb } from './db.ts';

// Context creation function
const createContext = async ({ req, res }: { req: any, res: any }): Promise<Context> => {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available.");
  }

  // For now, we'll just return a dummy user
  const user = { id: 1, role: 'admin' as const };
  return {
    req,
    res,
    user,
    db, // Pass the database instance to the context
  };
};

// Create a standalone tRPC server
const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext,
});

const port = 3000;
server.listen(port);

console.log(`tRPC server listening on http://localhost:${port}`);
