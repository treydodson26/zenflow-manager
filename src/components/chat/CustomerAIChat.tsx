import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Sparkles, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface CustomerLite {
  first_name?: string;
  last_name?: string;
  email?: string;
  id?: number | string;
}

interface Props {
  customer?: CustomerLite;
}

export default function CustomerAIChat({ customer }: Props) {
  const [tab, setTab] = useState<"ask" | "draft" | "research">("ask");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fullName = useMemo(() => {
    return [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "this customer";
  }, [customer?.first_name, customer?.last_name]);

  const placeholder = useMemo(() => {
    if (tab === "ask") return `Ask about ${fullName} (attendance, stage, preferences…)`;
    if (tab === "draft") return `Draft a personalized email or WhatsApp to ${fullName}`;
    return `Research talking points about ${fullName} (public info, interests…)`;
  }, [tab, fullName]);

  const example = useMemo(() => {
    if (tab === "ask") return "Summarize their journey and top class preference.";
    if (tab === "draft") return "Write a friendly message to convert them to Monthly Unlimited.";
    return "Find 3 relevant wellness topics to mention in outreach.";
  }, [tab]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { role: "user" as const, content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const fn = tab === "ask" ? "ai-ask" : tab === "draft" ? "ai-draft" : "enrich-customer";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { input: text, customer, tab },
      });
      if (error) throw error;

      const assistantMsg = { role: "assistant" as const, content: data?.text || "No response." };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "AI error", description: e?.message || "Something went wrong.", variant: "destructive" as any });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="border-none bg-[--card] shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="opacity-80" />
            <CardTitle>AI Assistant</CardTitle>
          </div>
        </div>
        <CardDescription>
          Ask questions about data, draft messages, or research context. This preview runs locally; connect API keys to enable live AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="ask">Ask Data</TabsTrigger>
            <TabsTrigger value="draft">Draft Message</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
          </TabsList>

          <div className="mx-auto max-w-3xl">
            <ScrollArea className="h-[280px] rounded-md border p-3">
              <div ref={listRef} className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Start by typing a prompt below — for example, "{example}"
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`rounded-md border p-3 ${m.role === 'assistant' ? 'bg-muted' : ''}`}>
                      <div className="text-xs text-muted-foreground mb-1">{m.role === 'assistant' ? 'Assistant' : 'You'}</div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 grid gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                aria-label="Chat prompt"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {tab === "ask" && <Sparkles className="h-4 w-4" />} {tab === "ask" && "Data Q&A"}
                  {tab === "draft" && <Send className="h-4 w-4" />} {tab === "draft" && "Personalized drafting"}
                  {tab === "research" && <Search className="h-4 w-4" />} {tab === "research" && "External research"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" type="button" onClick={() => setInput(example)} disabled={isSending}>
                    Use example
                  </Button>
                  <Button onClick={send} disabled={isSending || !input.trim()}>
                    <Send />
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content shells to keep a11y mapping for each tab; main UI shared above */}
          <TabsContent value="ask" />
          <TabsContent value="draft" />
          <TabsContent value="research" />
        </Tabs>
      </CardContent>
    </Card>
  );
}

