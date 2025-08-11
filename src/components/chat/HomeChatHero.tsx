import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Mic, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  const placeholder = useMemo(() => "Ask anything", []);

  const send = async (value?: string) => {
    const text = (value ?? input).trim();
    if (!text) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-text", {
        body: {
          prompt: text,
          model: "gpt-4.1-2025-04-14",
          temperature: 0.2,
          system: "You are Talo Yoga's helpful studio assistant. Be concise and actionable.",
        },
      });
      if (error) throw error;
      const reply = (data as any)?.text || (data as any)?.generatedText || "";
      setMessages((m) => [...m, { role: "assistant", content: reply || "(no response)" }]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Generation failed", description: String(e?.message || e), variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
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
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={placeholder}
                className="border-0 focus-visible:ring-0 h-11 flex-1"
              />

              <Button type="button" variant="ghost" size="icon" disabled className="rounded-full">
                <Mic className="h-5 w-5" />
              </Button>
              <Button type="button" size="icon" onClick={() => send()} disabled={loading} className="rounded-full">
                <Send className="h-5 w-5" />
              </Button>
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
