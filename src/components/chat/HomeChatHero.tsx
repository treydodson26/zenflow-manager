import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Send, Square, RotateCcw, User, Bot, Mic, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSidebar } from "@/components/ui/sidebar";


interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const EXAMPLES = [
  "Draft a Day 7 message for an intro client",
  "Summarize yesterday's attendance",
  "Who hasn’t booked since last month?",
  "Suggest a retention campaign for dropped members",
];

export default function HomeChatHero({ defaultFocus = false }: { defaultFocus?: boolean }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome! I’m Fred, your studio assistant. Ask about customers, attendance, campaigns, or tap a suggestion below to get started.",
      ts: Date.now(),
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingStopRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { open, toggleSidebar } = useSidebar();

  useEffect(() => {
    if (defaultFocus && open) {
      toggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFocus]);

  const placeholder = useMemo(() => "Ask anything", []);
const send = async (value?: string, options?: { replay?: boolean }) => {
  const text = (value ?? input).trim();
  if (!text) return;

  if (!options?.replay) {
    setMessages((m) => [...m, { role: "user", content: text, ts: Date.now() }]);
  }
  setInput("");
  setLoading(true);
  setIsStreaming(true);
  streamingStopRef.current = false;

  try {
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch(
      "https://mvndgpmetndvjsmvhqqh.functions.supabase.co/functions/v1/ask-fred",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bmRncG1ldG5kdmpzbXZocXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDk3NTUsImV4cCI6MjA2MTUyNTc1NX0.07clcHdUPZv-GWGGGVvLsk0PaSSYorbk2Md3_Qv4rw4",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bmRncG1ldG5kdmpzbXZocXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDk3NTUsImV4cCI6MjA2MTUyNTc1NX0.07clcHdUPZv-GWGGGVvLsk0PaSSYorbk2Md3_Qv4rw4",
        },
        body: JSON.stringify({ question: text }),
        signal: controller.signal,
      }
    );

    if (!res.ok) throw new Error(`ask-fred failed: ${res.status}`);
    const data = await res.json();
    const reply = (data as any)?.text || (data as any)?.generatedText || "";

    // Add assistant placeholder to stream into
    setMessages((m) => [...m, { role: "assistant", content: "", ts: Date.now() }]);

    await new Promise<void>((resolve) => {
      let i = 0;
      const total = reply.length;
      const stepFn = () => {
        if (streamingStopRef.current) return resolve();
        // adaptive step ~ 240 ticks total
        const step = Math.max(1, Math.ceil(total / 240));
        i = Math.min(total, i + step);
        const chunk = reply.slice(0, i);
        setMessages((m) => {
          const copy = [...m];
          const last = copy.length - 1;
          if (last >= 0 && copy[last].role === "assistant") {
            copy[last] = { ...copy[last], content: chunk };
          }
          return copy;
        });
        // keep scrolling as we stream
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        if (i >= total) return resolve();
        setTimeout(stepFn, 16);
      };
      stepFn();
    });
  } catch (e: any) {
    if (e?.name !== "AbortError") {
      console.error(e);
      toast({
        title: "Generation failed",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  } finally {
    setLoading(false);
    setIsStreaming(false);
    abortRef.current = null;
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
};

const stop = () => {
  streamingStopRef.current = true;
  abortRef.current?.abort();
  setLoading(false);
  setIsStreaming(false);
};

const regenerate = () => {
  if (messages.length === 0) return;
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") { lastUserIdx = i; break; }
  }
  if (lastUserIdx === -1) return;
  const prompt = messages[lastUserIdx].content;
  // remove trailing assistant message if present
  setMessages((m) => {
    const copy = [...m];
    if (copy[copy.length - 1]?.role === "assistant") copy.pop();
    return copy;
  });
  send(prompt, { replay: true });
};

  return (
    <section className="relative flex flex-col h-screen pt-8 sm:pt-12 bg-gradient-to-br from-background via-secondary to-primary/20">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-3xl mx-auto w-full">
          {messages.length <= 1 && !loading && !isStreaming && (
            <div className="px-4 pb-6 text-center animate-fade-in">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">
                Meet Fred, Emily's AI Studio Assistant
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8">Manage customers, automate communications, and grow your yoga studio</p>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const time = new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            return (
              <div key={i} className="px-4 py-3 group animate-fade-in">
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl border px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground border-primary shadow' : 'bg-muted/60 border-border shadow-sm'}`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-full border bg-background/80 flex items-center justify-center">
                        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ''}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`mt-1 text-xs text-muted-foreground ${isUser ? 'text-right' : 'text-left'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>{time}</div>
              </div>
            );
          })}

          {(loading || isStreaming) && (
            <div className="px-4 py-3">
              <div className="flex justify-start">
                <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl border shadow-sm px-4 py-3 bg-muted/60 border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border bg-background/80">
                      <Bot className="h-5 w-5" />
                    </div>
                    <span className="inline-flex gap-1 text-muted-foreground">
                      <span className="animate-pulse">•</span>
                      <span className="animate-pulse [animation-delay:150ms]">•</span>
                      <span className="animate-pulse [animation-delay:300ms]">•</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.length <= 1 && !loading && !isStreaming && (
            <div className="px-4 py-3 animate-fade-in">
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="px-3 py-1.5 text-sm rounded-full border bg-card/60 hover:bg-card/80 transition-colors hover-scale shadow-sm text-foreground border-border"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 w-full bg-transparent border-0 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex justify-center">
            <div className="relative w-full max-w-2xl">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 200) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading && !isStreaming) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={placeholder}
              className="w-full pr-28 resize-none rounded-2xl shadow bg-white/95 backdrop-blur border border-white/20 min-h-[80px] py-4 text-base placeholder:text-base"
              rows={3}
            />

            {/* Action buttons (focus, mic + send / stop / regenerate) */}
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button type="button" size="icon" variant="ghost" className="rounded-full" title={open ? "Exit focus mode" : "Focus mode"} onClick={toggleSidebar}>
                {open ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              </Button>
              <Button type="button" size="icon" variant="ghost" className="rounded-full" title="Voice">
                <Mic className="h-5 w-5" />
              </Button>
              {(loading || isStreaming) ? (
                <Button type="button" size="icon" onClick={stop} className="rounded-full" variant="destructive" title="Stop">
                  <Square className="h-5 w-5" />
                </Button>
              ) : (
                messages[messages.length - 1]?.role === "assistant" ? (
                  <Button type="button" size="icon" onClick={regenerate} className="rounded-full" variant="ghost" title="Regenerate">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button type="button" size="icon" onClick={() => send()} disabled={loading} className="rounded-full" title="Send">
                    <Send className="h-5 w-5" />
                  </Button>
                )
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
