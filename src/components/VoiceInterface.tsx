import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import { Mic, MicOff, Send, Loader2 } from "lucide-react";

interface VoiceInterfaceProps {
  onSpeakingChange?: (speaking: boolean) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onSpeakingChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    // You can inspect event types here and toggle speaking indicators
    if (event?.type === "response.audio.delta") onSpeakingChange?.(true);
    if (event?.type === "response.audio.done") onSpeakingChange?.(false);
  };

  const startConversation = async () => {
    try {
      setIsLoading(true);
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();

      // Start recording and streaming mic frames
      await chatRef.current.startRecording((encoded) => {
        chatRef.current?.sendAudioChunk(encoded);
      });

      setIsConnected(true);
      toast({ title: "Realtime connected", description: "Voice interface is ready." });
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast({ title: "Error", description: String(error?.message || error), variant: "destructive" as any });
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = () => {
    chatRef.current?.commitInput();
    chatRef.current?.disconnect();
    setIsConnected(false);
    onSpeakingChange?.(false);
  };

  const sendText = async () => {
    if (!input.trim()) return;
    await chatRef.current?.sendText(input.trim());
    setInput("");
  };

  useEffect(() => () => chatRef.current?.disconnect(), []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <Button onClick={startConversation} disabled={isLoading} className="inline-flex items-center gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Start Voice
          </Button>
        ) : (
          <Button onClick={endConversation} variant="secondary" className="inline-flex items-center gap-2">
            <MicOff className="h-4 w-4" /> Stop
          </Button>
        )}
      </div>

      <div className="w-[min(560px,90vw)] rounded-md border bg-background/80 backdrop-blur px-3 py-2 shadow">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
            placeholder="Type to send a text message to the voice model"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
          />
          <Button size="sm" onClick={sendText} className="inline-flex items-center gap-2">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;
