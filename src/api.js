async function http(method, url, body) {
  const init = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try { const data = JSON.parse(text); message = data?.error || message; } catch {}
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function createSession(apiBase) {
  return http('POST', `${apiBase}/api/session/create`);
}

export async function sendMessage(apiBase, sessionId, message) {
  return http('POST', `${apiBase}/api/chat`, { sessionId, message });
}

export async function getHistory(apiBase, sessionId) {
  const data = await http('GET', `${apiBase}/api/session/${encodeURIComponent(sessionId)}/history`);
  return data?.history || [];
}

export async function refreshRAG(apiBase) {
  return http('POST', `${apiBase}/api/refresh-rag`);
}


