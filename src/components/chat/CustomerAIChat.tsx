import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Sparkles, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

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
  const [isTesting, setIsTesting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fullName = useMemo(() => {
    return [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "this customer";
  }, [customer?.first_name, customer?.last_name]);
  const MAX = 600;

  const placeholder = useMemo(() => {
    if (tab === "ask") return `Ask about ${fullName}'s data (attendance, stage, preferences).`;
    if (tab === "draft") return `Describe the message to generate for ${fullName} (tone, length, CTA).`;
    return `Research talking points for outreach to ${fullName}.`;
  }, [tab, fullName]);

  const example = useMemo(() => {
    if (tab === "ask") return "What’s their show rate and favorite class time?";
    if (tab === "draft") return `Draft a warm WhatsApp to convert ${fullName} to Monthly Unlimited with a 10% offer.`;
    return "Find 3 relevant wellness topics to mention in outreach.";
  }, [tab, fullName]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { role: "user" as const, content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const fn = tab === "ask" ? "ai-ask" : tab === "draft" ? "ai-draft" : "research-customer";
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

  const testSdk = async () => {
    const prompt = (input || `Say hi to ${fullName}`).trim();
    try {
      setIsTesting(true);
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { prompt },
      });
      if (error) throw error;
      const text = data?.text || 'No response.';
      setMessages((m) => [...m, { role: 'assistant', content: text }]);
      toast({ title: 'Ask AI', description: 'Response received.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ask AI error', description: e?.message || 'Something went wrong.', variant: 'destructive' as any });
    } finally {
      setIsTesting(false);
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
          Ask questions or generate drafts. Choose a mode, enter your prompt, then Generate. The response appears in the Conversation above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="mode">Mode</Label>
              <Select value={tab} onValueChange={(v) => setTab(v as any)}>
                <SelectTrigger id="mode" className="w-[220px]">
                  <SelectValue placeholder="Choose mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ask">Ask data</SelectItem>
                  <SelectItem value="draft">Draft message</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {tab === "ask" ? "Query customer data and get insights." : tab === "draft" ? "Generate a personalized email/WhatsApp draft." : "Find external talking points."}
            </div>
          </div>

          <div className="w-full">
            <div className="grid gap-3">
              <div>
                <Label>Conversation</Label>
                <ScrollArea className="h-[280px] rounded-md border bg-muted/30 p-3">
                  <div ref={listRef} className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No messages yet. Click Generate to see the output here.
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
              </div>

              <div>
                <Label htmlFor="prompt">Your prompt</Label>
                <Textarea
                  id="prompt"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  aria-label="Chat prompt"
                  rows={5}
                  maxLength={MAX}
                />
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tip: include tone, length, and a clear call-to-action. The response appears above.</span>
                  <span>{input.length}/{MAX}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" type="button" onClick={() => setInput(example)} disabled={isSending}>
                  Use example
                </Button>
                <Button onClick={send} disabled={isSending || !input.trim()} aria-label="Generate response">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSending ? "Generating..." : "Generate"}
                </Button>
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

