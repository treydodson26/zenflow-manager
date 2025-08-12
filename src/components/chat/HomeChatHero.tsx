import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Mic, Send, Square, RotateCcw } from "lucide-react";


interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLES = [
  "Draft a Day 7 message for an intro client",
  "Summarize yesterday's attendance",
  "Who hasn’t booked since last month?",
  "Suggest a retention campaign for dropped members",
];

export default function HomeChatHero() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingStopRef = useRef(false);

  const placeholder = useMemo(() => "Ask anything", []);

const send = async (value?: string, options?: { replay?: boolean }) => {
  const text = (value ?? input).trim();
  if (!text) return;

  if (!options?.replay) {
    setMessages((m) => [...m, { role: "user", content: text }]);
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
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

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
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/15 p-6 sm:p-10">
      <div className="mx-auto w-full max-w-3xl text-center">
        <p className="text-sm text-muted-foreground mb-2">Fred — Studio Assistant</p>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Chat with Fred</h2>
        <p className="text-muted-foreground mt-2">Plan outreach, analyze attendance, or draft a WhatsApp in one place.</p>

        <div className="mt-6 flex items-center justify-center">
          <div className="w-full max-w-3xl rounded-full border bg-background shadow-lg">
            <div className="flex items-center gap-2 px-3 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem disabled>Add photos & files</DropdownMenuItem>
                  <DropdownMenuItem disabled>Agent mode</DropdownMenuItem>
                  <DropdownMenuItem disabled>Use connectors</DropdownMenuItem>
                  <DropdownMenuItem disabled>Deep research</DropdownMenuItem>
                  <DropdownMenuItem disabled>Think longer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

<Input
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !loading && !isStreaming && send()}
  placeholder={placeholder}
  className="border-0 focus-visible:ring-0 h-11 flex-1"
/>

<Button type="button" variant="ghost" size="icon" disabled className="rounded-full">
  <Mic className="h-5 w-5" />
</Button>
{(loading || isStreaming) ? (
  <Button type="button" size="icon" onClick={stop} className="rounded-full" variant="destructive">
    <Square className="h-5 w-5" />
  </Button>
) : (
  messages[messages.length - 1]?.role === "assistant" ? (
    <Button type="button" size="icon" onClick={regenerate} className="rounded-full" variant="ghost" title="Regenerate">
      <RotateCcw className="h-5 w-5" />
    </Button>
  ) : (
    <Button type="button" size="icon" onClick={() => send()} disabled={loading} className="rounded-full">
      <Send className="h-5 w-5" />
    </Button>
  )
)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => send(ex)}
              className="text-xs sm:text-sm rounded-full border bg-background/60 px-3 py-1 hover:bg-muted"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation area */}
      {messages.length > 0 && (
        <div className="mx-auto mt-8 w-full max-w-3xl space-y-4">
          {messages.map((m, i) => (
            <Card key={i} className={m.role === "user" ? "border-primary/30" : ""}>
              <div className="px-4 py-3 text-sm whitespace-pre-wrap">
                <span className="font-medium mr-2">{m.role === "user" ? "You" : "Fred"}:</span>
                {m.content}
              </div>
            </Card>
          ))}
          {loading && (
            <Card>
              <div className="px-4 py-3 text-sm text-muted-foreground">Thinking…</div>
            </Card>
          )}
          <div ref={scrollRef} />
        </div>
      )}
    </section>
  );
}
