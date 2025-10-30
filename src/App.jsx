import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createSession, sendMessage, getHistory, refreshRAG } from './api';

export default function App() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState('');
  const [successFade, setSuccessFade] = useState(false);

  const apiBase = useMemo(() => {
    const envBase = import.meta.env.VITE_API_BASE;
    const useProxy = import.meta.env.VITE_USE_PROXY === 'true';
    if (import.meta.env.DEV || useProxy) return '';
    return envBase || 'https://news-rag-bot.onrender.com';
  }, []);

  const STORAGE_KEY = 'news_rag_session_id';
  const successTimers = useRef({ fade: null, clear: null });

  function clearSuccessTimers() {
    if (successTimers.current.fade) clearTimeout(successTimers.current.fade);
    if (successTimers.current.clear) clearTimeout(successTimers.current.clear);
    successTimers.current.fade = null;
    successTimers.current.clear = null;
  }

  function showSuccess(message) {
    setSuccess(message);
    setSuccessFade(false);
    clearSuccessTimers();
    successTimers.current.fade = setTimeout(() => setSuccessFade(true), 9000);
    successTimers.current.clear = setTimeout(() => setSuccess(''), 10000);
  }

  useEffect(() => {
    return () => {
      clearSuccessTimers();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setError('');
      setSuccess('');

      const storedId = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (storedId) {
        try {
          const history = await getHistory(apiBase, storedId);
          if (!mounted) return;
          setSessionId(storedId);
          setMessages(expandMessagesWithSources(history));
          return; 
        } catch (e) {
          
        }
      }

      
      try {
        const { sessionId: sid } = await createSession(apiBase);
        if (!mounted) return;
        setSessionId(sid);
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, sid);
        const history = await getHistory(apiBase, sid);
        if (!mounted) return;
        setMessages(expandMessagesWithSources(history));
      } catch (e) {
        setError(e?.message || 'Failed to initialize session');
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [apiBase]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function normalizeContent(content) {
    if (content == null) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      if (typeof content.answer === 'string') return content.answer;
      if (typeof content.text === 'string') return content.text;
      try { return JSON.stringify(content); } catch { return String(content); }
    }
    return String(content);
  }

  function formatSources(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return null;
    return sources
      .map((s, i) => `${i + 1}. ${s.title} (${s.source})${s.link ? ` - ${s.link}` : ''} [score: ${Number(s.relevanceScore).toFixed(3)}]`)
      .join('\n');
  }

  function expandMessagesWithSources(items) {
    const expanded = [];
    for (const m of items) {
      if (m?.role === 'assistant' && m?.content && typeof m.content === 'object') {
        const answerText = normalizeContent(m.content);
        expanded.push({ ...m, content: answerText });
        const sourcesText = formatSources(m.content.sources);
        if (sourcesText) {
          expanded.push({ role: 'assistant', content: `Sources:\n${sourcesText}`, timestamp: m.timestamp, kind: 'sources' });
        }
      } else {
        expanded.push({ ...m, content: normalizeContent(m.content) });
      }
    }
    return expanded;
  }

  async function onSend(e) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;
    setError('');
    const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendMessage(apiBase, sessionId, userMsg.content);
      // Backend returns { sessionId, answer: { answer: string, sources: [...] }, timestamp }
      const assistantText = res?.answer?.answer ?? String(res?.answer ?? '');
      const assistantMsg = { role: 'assistant', content: assistantText, timestamp: res?.timestamp };
      setMessages(prev => [...prev, assistantMsg]);
      if (Array.isArray(res?.answer?.sources) && res.answer.sources.length > 0) {
        const sourcesText = formatSources(res.answer.sources);
        if (sourcesText) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Sources:\n${sourcesText}`, kind: 'sources' }]);
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  }

  // Handler for resetting session
  async function onResetSession() {
    setError('');
    setSuccess('');
    setSuccessFade(false);
    clearSuccessTimers();
    try {
      const { sessionId: sid } = await createSession(apiBase);
      setSessionId(sid);
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, sid);
      const history = await getHistory(apiBase, sid);
      setMessages(expandMessagesWithSources(history));
    } catch (e) {
      setError(e?.message || 'Failed to reset session');
    }
  }

  // Handler for refreshing RAG data
  async function onRefreshRAG() {
    setRefreshing(true);
    setError('');
    setSuccess('');
    setSuccessFade(false);
    clearSuccessTimers();
    try {
      await refreshRAG(apiBase);
      showSuccess('Knowledge base reloaded!');
    } catch (e) {
      setError(e?.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="brand">NewsWise AI 📰</h1>
        <div className="meta">
          <button className="meta-btn meta-btn--reset" style={{marginLeft: 8}} onClick={onResetSession} disabled={loading || refreshing}>Reset Session</button>
          <button className="meta-btn" onClick={onRefreshRAG} disabled={refreshing || loading}>{refreshing ? 'Reloading...' : 'Reload Knowledge Base'}</button>
        </div>
      </header>

      <main className="main">
        <div className="messages" ref={listRef}>
          {messages.length === 0 && !loading && (
            <div className="empty">
              <div className="empty-card">
                <div className="empty-title">Ask the news, get answers.</div>
                <div className="empty-sub">Try prompts like:</div>
                <ul className="empty-list">
                  <li>⚡ What are today's top headlines?</li>
                  <li>📊 Summarize the latest on the stock market</li>
                  <li>🌍 What's trending globally right now?</li>
                </ul>
              </div>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`message ${m.role} ${m.kind === 'sources' ? 'sources' : ''}`}>
              <div className="bubble">
                {String(m.content).split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant"><div className="bubble">Thinking…</div></div>
          )}
        </div>

        {success && <div className={`success ${successFade ? 'fade' : ''}`}>{success}</div>}
        {error && <div className="error">{error}</div>}

        <form className="composer" onSubmit={onSend}>
          <input
            type="text"
            placeholder="Ask about the latest news…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!sessionId || loading}
          />
          <button type="submit" disabled={!input.trim() || !sessionId || loading}>Send</button>
        </form>
      </main>
    </div>
  );
}


