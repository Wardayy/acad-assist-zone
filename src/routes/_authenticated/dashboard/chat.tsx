import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Plus, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listConversations, getMessages, sendChatMessage, deleteConversation,
} from "@/lib/ai.functions";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/dashboard/chat")({
  head: () => ({ meta: [{ title: "AI Study Chatbot — StudyBloom AI" }] }),
  component: ChatPage,
});

function ChatPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const msgFn = useServerFn(getMessages);
  const sendFn = useServerFn(sendChatMessage);
  const delFn = useServerFn(deleteConversation);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convQ = useQuery({ queryKey: ["conversations"], queryFn: () => listFn() });
  const msgQ = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => msgFn({ data: { conversationId: activeId! } }),
    enabled: !!activeId,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgQ.data, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      const res = await sendFn({ data: { conversationId: activeId, content: text } });
      setActiveId(res.conversationId);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", res.conversationId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    await delFn({ data: { conversationId: id } });
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Conversation deleted");
  }

  const messages = msgQ.data?.messages ?? [];

  return (
    <div className="h-[calc(100vh-7rem)] max-w-6xl mx-auto grid lg:grid-cols-[260px_1fr] gap-4">
      {/* Conversation list */}
      <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-3 hidden lg:flex flex-col">
        <button
          onClick={() => { setActiveId(null); }}
          className="w-full rounded-2xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="mt-3 overflow-y-auto flex-1 space-y-1">
          {(convQ.data?.conversations ?? []).map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-2xl px-3 py-2 text-sm cursor-pointer ${
                activeId === c.id ? "bg-accent" : "hover:bg-accent/60"
              }`}
              onClick={() => setActiveId(c.id)}
            >
              <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat surface */}
      <div className="rounded-3xl bg-card border border-border/60 shadow-card flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5">
          {messages.length === 0 && !sending && (
            <div className="h-full grid place-items-center text-center">
              <div>
                <div className="h-14 w-14 mx-auto rounded-3xl bg-gradient-primary grid place-items-center shadow-glow">
                  <MessageCircle className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">Ask anything 📚</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                  Your AI tutor adapts to your subjects, level and language. Try "Explain photosynthesis like I'm 12" or "Quiz me on Newton's laws."
                </p>
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-card ${
                  m.role === "user"
                    ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                    : "bg-blush text-foreground rounded-bl-md"
                }`}
              >
                {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-3xl bg-blush px-4 py-3 shadow-card flex gap-1.5">
                <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="border-t border-border/60 p-3 md:p-4 flex items-end gap-2 bg-background/40"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder="Ask your study tutor..."
            className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20 max-h-40"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-12 w-12 rounded-2xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft disabled:opacity-50"
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
