import { ReactNode, useMemo } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

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

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
