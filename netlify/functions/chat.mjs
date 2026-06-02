const OPENAI_BASE = 'https://api.openai.com/v1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function openaiFetch(apiKey, path, options = {}) {
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'OpenAI request failed';
    throw new Error(msg);
  }
  return data;
}

function buildSessionContext(vars = {}) {
  const lines = [
    'Session context (use for navigation and idea category):',
    `- current_page: ${vars.current_page || 'unknown'}`,
    `- ideas_category: ${vars.ideas_category || 'research'}`,
    `- user_role: ${vars.user_role || 'User'}`,
    `- vault_root: ${vars.vault_root || 'https://asabtan.sa'}`,
  ];
  if (vars.uploaded_file_name) lines.push(`- uploaded_file_name: ${vars.uploaded_file_name}`);
  if (vars.website_context) lines.push(`- website_context: ${vars.website_context}`);
  return lines.join('\n');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForRun(apiKey, threadId, runId, maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const run = await openaiFetch(apiKey, `/threads/${threadId}/runs/${runId}`, { method: 'GET' });
    if (run.status === 'completed') return run;
    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(run.last_error?.message || `Run ${run.status}`);
    }
    if (run.status === 'requires_action') return run;
    await sleep(800);
  }
  throw new Error('Assistant run timed out');
}

function extractToolCalls(run) {
  const calls = run?.required_action?.submit_tool_outputs?.tool_calls || [];
  return calls
    .filter((tc) => tc.type === 'function')
    .map((tc) => {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch (e) {
        args = {};
      }
      return {
        id: tc.id,
        name: tc.function.name,
        arguments: args,
      };
    });
}

async function getLatestAssistantText(apiKey, threadId) {
  const data = await openaiFetch(
    apiKey,
    `/threads/${threadId}/messages?limit=20&order=desc`,
    { method: 'GET' }
  );
  const msg = (data.data || []).find((m) => m.role === 'assistant');
  if (!msg) return '';
  return (msg.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text?.value || '')
    .join('\n')
    .trim();
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return json(500, {
      error: 'Missing OPENAI_API_KEY or OPENAI_ASSISTANT_ID in Netlify environment variables.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const message = String(payload.message || '').trim();
  if (!message) {
    return json(400, { error: 'message is required' });
  }

  const variables = payload.variables || {};
  let threadId = payload.threadId || null;

  try {
    if (!threadId) {
      const thread = await openaiFetch(apiKey, '/threads', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      threadId = thread.id;
    }

    await openaiFetch(apiKey, `/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        role: 'user',
        content: `${buildSessionContext(variables)}\n\nUser message:\n${message}`,
      }),
    });

    let run = await openaiFetch(apiKey, `/threads/${threadId}/runs`, {
      method: 'POST',
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    run = await waitForRun(apiKey, threadId, run.id);

    const clientToolCalls = [];

    if (run.status === 'requires_action') {
      const toolCalls = extractToolCalls(run);
      toolCalls.forEach((tc) => {
        if (tc.name === 'navigate_to_page' || tc.name === 'prefill_idea_draft') {
          clientToolCalls.push({ name: tc.name, arguments: tc.arguments });
        }
      });

      const toolOutputs = toolCalls.map((tc) => ({
        tool_call_id: tc.id,
        output: JSON.stringify({
          ok: true,
          handled_by: 'vault_client',
          name: tc.name,
        }),
      }));

      if (toolOutputs.length) {
        run = await openaiFetch(apiKey, `/threads/${threadId}/runs/${run.id}/submit_tool_outputs`, {
          method: 'POST',
          body: JSON.stringify({ tool_outputs: toolOutputs }),
        });
        run = await waitForRun(apiKey, threadId, run.id);
      }
    }

    const text = await getLatestAssistantText(apiKey, threadId);

    return json(200, {
      threadId,
      text,
      toolCalls: clientToolCalls,
    });
  } catch (err) {
    return json(500, { error: err.message || 'Assistant request failed' });
  }
}
