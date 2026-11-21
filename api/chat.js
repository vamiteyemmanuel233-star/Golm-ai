// Vercel serverless function: POST /api/chat
// Same validation, prompt and Gemini call as the local server (server/index.mjs).
// The API key comes from Vercel's Environment Variables (GEMINI_API_KEY) — never from code.
import { clientIp, handleChat, sendJson } from '../server/handlers.mjs';

export default async function handler(req, res) {
  const result = await handleChat(process.env, {
    method: req.method,
    contentType: req.headers['content-type'],
    body: req.body,
    ip: clientIp(req.headers),
  });
  sendJson(res, result);
}
