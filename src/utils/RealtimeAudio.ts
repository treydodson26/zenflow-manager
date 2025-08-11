import { supabase } from "@/integrations/supabase/client";

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.onAudioData(new Float32Array(inputData));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    this.source?.disconnect();
    this.processor?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source = null;
    this.processor = null;
    this.stream = null;
    this.audioContext?.close();
    this.audioContext = null;
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
};

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;

  constructor(private onMessage: (message: any) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init() {
    // Get ephemeral token from Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("openai-realtime-session");
    if (error) throw error;

    // OpenAI returns a session object containing client_secret.value
    const EPHEMERAL_KEY = (data as any)?.client_secret?.value;
    if (!EPHEMERAL_KEY) throw new Error("Failed to get ephemeral token");

    // Create peer connection
    this.pc = new RTCPeerConnection();

    // Set up remote audio
    this.pc.ontrack = (e) => (this.audioEl.srcObject = e.streams[0]);

    // Add local mic track
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.pc.addTrack(ms.getTracks()[0]);

    // Data channel for events
    this.dc = this.pc.createDataChannel("oai-events");
    this.dc.addEventListener("message", (e) => {
      try {
        const event = JSON.parse(e.data);
        this.onMessage(event);
      } catch {}
    });

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Connect to OpenAI Realtime API
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = { type: "answer" as RTCSdpType, sdp: await sdpResponse.text() };
    await this.pc.setRemoteDescription(answer);
  }

  async startRecording(onChunk: (encoded: string) => void) {
    this.recorder = new AudioRecorder((audioData) => {
      if (this.dc?.readyState === "open") {
        onChunk(encodeAudioForAPI(audioData));
      }
    });
    await this.recorder.start();
  }

  sendAudioChunk(encoded: string) {
    this.dc?.send(
      JSON.stringify({ type: "input_audio_buffer.append", audio: encoded })
    );
  }

  commitInput() {
    this.dc?.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    this.dc?.send(JSON.stringify({ type: "response.create" }));
  }

  async sendText(text: string) {
    if (!this.dc || this.dc.readyState !== "open") return;
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    };
    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: "response.create" }));
  }

  disconnect() {
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
  }
}
