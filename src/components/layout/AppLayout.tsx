import { ReactNode, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot } from "lucide-react";
import AgentFred from "@/components/AgentFred";
import VoiceInterface from "@/components/VoiceInterface";
interface AppLayoutProps { children: ReactNode }

export const AppLayout = ({ children }: AppLayoutProps) => {
  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);
  const [open, setOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen w-full">
        <header className="sticky top-0 z-40 h-16 flex items-center border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:inline">Talo Yoga Studio Manager</span>
            </div>
            <div className="text-sm text-foreground whitespace-nowrap tabular-nums">{today}</div>
          </div>
        </header>

        {/* Floating Fred assistant button */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Fred assistant"
          className="fixed top-20 right-6 z-50 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover-scale"
        >
          <Bot className="w-5 h-5" />
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fred — Studio Agent</DialogTitle>
            </DialogHeader>
            <AgentFred />
          </DialogContent>
        </Dialog>

        <main className="flex-1 p-4 lg:p-6">{children}</main>

        {/* Realtime OpenAI voice interface - floating control */}
        <VoiceInterface />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
