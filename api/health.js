// Vercel serverless function: GET /api/health
// Tells the app whether live AI is configured (never reveals the key).
import { handleHealth, sendJson } from '../server/handlers.mjs';

export default function handler(req, res) {
  sendJson(res, handleHealth(process.env));
}
