import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { Mic, MicOff, Settings, Loader2 } from "lucide-react";
import { useConversation } from "@11labs/react";

interface AgentFredProps {
  className?: string;
}

export const AgentFred = ({ className }: AgentFredProps) => {
  const [agentId, setAgentId] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  // restore from localStorage
  useEffect(() => {
    const a = localStorage.getItem("fred_agent_id") || "";
    const u = localStorage.getItem("fred_signed_url") || "";
    setAgentId(a);
    setSignedUrl(u);
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      toast({ title: "Fred connected", description: "Microphone active. Say hello to Fred." });
    },
    onDisconnect: () => {
      toast({ title: "Fred disconnected", description: "Session ended." });
    },
    onMessage: (msg: any) => {
      // Store raw text if present, otherwise stringify for debug
      const text = msg?.text || msg?.message || (typeof msg === "string" ? msg : JSON.stringify(msg));
      if (text) setLogs((prev) => [...prev.slice(-30), text]);
    },
    onError: (err: any) => {
      toast({ title: "Fred error", description: String(err), variant: "destructive" as any });
    },
  });

  const connecting = conversation.status !== "connected" && conversation.status !== "disconnected";
  const connected = conversation.status === "connected";

  const start = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!signedUrl && !agentId) {
        toast({
          title: "Agent details required",
          description: "Provide a public agentId or a signed URL to connect.",
        });
        setShowSettings(true);
        return;
      }
      if (signedUrl) {
        await (conversation as any).startSession({ url: signedUrl });
        localStorage.setItem("fred_signed_url", signedUrl);
      } else {
        await conversation.startSession({ agentId });
        localStorage.setItem("fred_agent_id", agentId);
      }
    } catch (e: any) {
      toast({ title: "Microphone or agent error", description: String(e), variant: "destructive" as any });
    }
  };

  const stop = async () => {
    await conversation.endSession();
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">F</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>Fred — Studio Agent</CardTitle>
            <p className="text-sm text-muted-foreground">Ask about attendance, revenue, instructors, or scheduling.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Agent settings"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Public Agent ID (optional if signed URL provided)</label>
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="elevenlabs agent id"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Signed URL (recommended for private agents)</label>
              <input
                value={signedUrl}
                onChange={(e) => setSignedUrl(e.target.value)}
                placeholder="https://api.elevenlabs.io/...signed_url"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                You’ll need your ElevenLabs API key to generate a signed URL on a server. Share it with me and I’ll help wire it in.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {!connected ? (
            <Button onClick={start} disabled={connecting} className="inline-flex items-center gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Connect to Fred
            </Button>
          ) : (
            <Button variant="secondary" onClick={stop} className="inline-flex items-center gap-2">
              <MicOff className="h-4 w-4" /> Disconnect
            </Button>
          )}
          <span className="text-xs text-muted-foreground">Status: {conversation.status || "disconnected"}</span>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 max-h-56 overflow-auto text-sm">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">Fred will display transcripts and replies here during your voice session.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l, i) => (
                <li key={i} className="leading-snug">{l}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentFred;
