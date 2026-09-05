import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import { whatsappSupportUrl } from '@/lib/whatsapp-support';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const initialMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hello! I can help with products and prices, orders, local supply, export, news, vacancies, and public company information. How can I help?',
  suggestions: ['Show me prices', 'Latest news', 'Current vacancies'],
};

export default function WhatsAppSupport() {
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
    <aside className="fixed bottom-5 right-4 z-[90] font-sans sm:right-5 lg:bottom-6" aria-label="WhatsApp customer support">
      {isOpen ? (
        <section id="whatsapp-support-panel" className="mb-3 flex w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#0b432f]/15 bg-white shadow-[0_24px_60px_rgba(7,47,31,.28)]" aria-live="polite">
          <header className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#25d366] ring-2 ring-white/25"><MessageCircle className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">JBA GreenGold support</h2><p className="text-[11px] text-white/80">Usually replies instantly</p></div>
            <button type="button" onClick={() => setIsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10" aria-label="Close WhatsApp support"><X className="h-5 w-5" /></button>
          </header>
          <div ref={messageListRef} className="max-h-[min(26rem,56dvh)] min-h-60 space-y-3 overflow-y-auto bg-[#efeae2] p-3">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'ml-8 text-right' : 'mr-5'}>
                <p className={`inline-block whitespace-pre-line rounded-2xl px-3 py-2 text-left text-sm leading-5 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-[#d9fdd3] text-[#173d24]' : 'rounded-bl-md bg-white text-[#26342d]'}`}>{message.text}</p>
                {message.suggestions?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{message.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={isSending} className="rounded-full border border-[#0b432f]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0b5d3b] hover:bg-[#e6f5e8] disabled:opacity-60">{suggestion}</button>)}</div> : null}
              </div>
            ))}
            {isSending ? <p className="w-fit rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs text-[#566459] shadow-sm">Typing…</p> : null}
          </div>
          <div className="border-t border-[#0b432f]/10 bg-white p-3">
            <a href={whatsappSupportUrl(draft || 'Hello JBA GreenGold support, I would like some help.')} target="_blank" rel="noreferrer" className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-[#25d366] px-3 py-2 text-xs font-bold text-white hover:bg-[#1fbc5a]"><ExternalLink className="h-3.5 w-3.5" /> Continue on WhatsApp</a>
            <form onSubmit={(event) => { event.preventDefault(); sendMessage(draft); }} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="whatsapp-support-message">Your support message</label>
              <input id="whatsapp-support-message" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message…" className="h-10 min-w-0 flex-1 rounded-full border border-[#0b432f]/15 bg-[#f7faf7] px-4 text-sm outline-none placeholder:text-[#768178] focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/25" />
              <button type="submit" disabled={!draft.trim() || isSending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#075e54] text-white hover:bg-[#064d45] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send support message"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="group flex items-center gap-3 rounded-full bg-[#25d366] p-2 pr-5 text-left text-white shadow-[0_12px_32px_rgba(19,105,58,.34)] transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#25d366]/35" aria-expanded={isOpen} aria-controls="whatsapp-support-panel">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#25d366]"><MessageCircle className="h-6 w-6" /></span>
        <span><span className="block text-xs font-black">WhatsApp support</span><span className="block text-[10px] text-white/85">Available 24/7</span></span>
      </button>
    </aside>
  );
}
