import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, Send, X } from 'lucide-react';
import { whatsappSupportUrl } from '@/lib/whatsapp-support';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const initialMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hello! I can help with products and prices, orders, local supply, export, news, vacancies, and public company information. How can I help?',
  suggestions: ['Show me prices', 'Latest news', 'Current vacancies'],
};

export default function WhatsAppSupport() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  const hidden = path === '/admin' || path.startsWith('/admin/') ||
    ['/login', '/register', '/staff-login', '/accept-staff-invite'].includes(path);

  return hidden ? null : <WhatsAppSupportWidget />;
}

function WhatsAppSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messageId = useRef(1);
  const messageListRef = useRef(null);

  // Keep the most recent customer message, typing state, and assistant reply in
  // view. The support panel stays at the latest exchange without requiring the
  // customer to manually scroll through the conversation.
  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [isSending, messages]);

  const sendMessage = async (message) => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    setMessages((current) => [...current, { id: `user-${messageId.current++}`, role: 'user', text: trimmed }]);
    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/support/chat`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Support is temporarily unavailable.');
      setMessages((current) => [...current, { id: `assistant-${messageId.current++}`, role: 'assistant', text: payload.data.reply, suggestions: payload.data.suggestions }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `assistant-${messageId.current++}`, role: 'assistant', text: `${error.message} You can still continue the conversation on WhatsApp.` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="whatsapp-support font-sans" aria-label="WhatsApp customer support">
      {isOpen ? (
        <section id="whatsapp-support-panel" className="mb-3 flex w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#123524]/15 bg-white shadow-[0_24px_60px_rgba(7,47,31,.28)]" aria-live="polite">
          <header className="flex items-center gap-3 bg-[#1b5e20] px-4 py-3 text-white">
            <img src="/brand/whatsapp.svg" width="40" height="40" alt="" className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">JBA GreenGold support</h2><p className="text-[11px] text-white/80">Usually replies instantly</p></div>
            <button type="button" onClick={() => setIsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10" aria-label="Close WhatsApp support"><X className="h-5 w-5" /></button>
          </header>
          <div ref={messageListRef} className="whatsapp-messages min-h-0 space-y-3 overflow-y-auto bg-[#e8f5e9] p-3">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'ml-8 text-right' : 'mr-5'}>
                <p className={`inline-block whitespace-pre-line rounded-2xl px-3 py-2 text-left text-sm leading-5 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-[#f4fbf5] text-[#123524]' : 'rounded-bl-md bg-white text-[#123524]'}`}>{message.text}</p>
                {message.suggestions?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{message.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={isSending} className="rounded-full border border-[#123524]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1b5e20] hover:bg-[#f4fbf5] disabled:opacity-60">{suggestion}</button>)}</div> : null}
              </div>
            ))}
            {isSending ? <p className="w-fit rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs text-[#355e3b] shadow-sm">Typing…</p> : null}
          </div>
          <div className="border-t border-[#123524]/10 bg-white p-3">
            <a href={whatsappSupportUrl(draft || 'Hello JBA GreenGold support, I would like some help.')} target="_blank" rel="noreferrer" className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-[#2e7d32] px-3 py-2 text-xs font-bold text-white hover:bg-[#256b2a]"><ExternalLink className="h-3.5 w-3.5" /> Continue on WhatsApp</a>
            <form onSubmit={(event) => { event.preventDefault(); sendMessage(draft); }} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="whatsapp-support-message">Your support message</label>
              <input id="whatsapp-support-message" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message…" className="h-10 min-w-0 flex-1 rounded-full border border-[#123524]/15 bg-[#f9fcfa] px-4 text-sm outline-none placeholder:text-[#5f7565] focus:border-[#a5d6a7] focus:ring-2 focus:ring-[#a5d6a7]/25" />
              <button type="submit" disabled={!draft.trim() || isSending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1b5e20] text-white hover:bg-[#1b5e20] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send support message"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="whatsapp-launcher" aria-label={isOpen ? 'Close WhatsApp support' : 'Open WhatsApp support'} aria-expanded={isOpen} aria-controls="whatsapp-support-panel">
        <img src="/brand/whatsapp.svg" width="56" height="56" alt="" />
      </button>
    </aside>
  );
}
