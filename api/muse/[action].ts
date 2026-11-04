import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleMuseRequest } from '../../server/muse.js';

/**
 * Vercel function: /api/muse/<status|counter|intent|insights>.
 * It lets a deployed demo use Muse Spark with the key kept in Vercel's environment variables (MODEL_API_KEY),
 * so no separate server is needed and the key never reaches the browser.
 */
type VercelLikeRequest = IncomingMessage & { query?: Record<string, string | string[] | undefined>; body?: unknown };

export default async function handler(req: VercelLikeRequest, res: ServerResponse): Promise<void> {
  const raw = req.query?.action;
  const action = Array.isArray(raw) ? raw[0] : raw ?? '';
  const client = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim();
  let body: unknown = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const [status, data] = await handleMuseRequest(action, req.method ?? 'GET', body, client);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
