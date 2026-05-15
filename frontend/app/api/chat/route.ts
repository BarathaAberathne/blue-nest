import { buildSystemPrompt } from '@/lib/chatbot-knowledge';
import type { PageContext } from '@/types/chat';

export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  messages: Array<{ role: string; content: string }>;
  page: PageContext;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Chat service temporarily unavailable' }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages, page = 'general' } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array is required' }, { status: 400 });
  }

  // Sanitise messages: only allow user/assistant roles, cap content length
  const safeMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20) // keep last 20 messages for context window management
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content).slice(0, 2000),
    }));

  if (safeMessages.length === 0) {
    return Response.json({ error: 'No valid messages provided' }, { status: 400 });
  }

  const model = process.env.CHAT_MODEL ?? 'claude-haiku-4-5-20251001';

  let upstream: Response;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: buildSystemPrompt(page),
        messages: safeMessages,
        stream: true,
      }),
    });
  } catch (err) {
    console.error('[chat/api] Network error reaching Anthropic:', err);
    return Response.json({ error: 'Service unavailable' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => 'unknown error');
    console.error('[chat/api] Anthropic error:', upstream.status, errText);
    return Response.json({ error: 'Upstream service error' }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
