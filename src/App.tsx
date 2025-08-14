import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "@/components/layout/AppLayout";
import CustomerDetail from "./pages/CustomerDetail";
import Customers from "./pages/Customers";
import ImportArketa from "./pages/ImportArketa";
import Leads from "./pages/Leads";
import Dashboard from "./pages/Dashboard";
import ImageStudio from "./pages/ImageStudio";
import MarketingHub from "./pages/MarketingHub";
import InstructorHub from "./pages/InstructorHub";
import MessageSequences from "./pages/MessageSequences";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/import" element={<ImportArketa />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/images" element={<ImageStudio />} />
            <Route path="/marketing" element={<MarketingHub />} />
            <Route path="/instructor-hub" element={<InstructorHub />} />
            <Route path="/sequences" element={<MessageSequences />} />
            <Route path="/customer/:id" element={<CustomerDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
