
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Leads from "./pages/Leads";
import Students from "./pages/Students";
import IntroOffers from "./pages/IntroOffers";
import CommunicationHub from "./pages/CommunicationHub";
import MessageSequences from "./pages/MessageSequences";
import SequenceBuilder from "./pages/SequenceBuilder";
import MessageApproval from "./pages/MessageApproval";
import MarketingHub from "./pages/MarketingHub";
import InstructorHub from "./pages/InstructorHub";
import ImportArketa from "./pages/ImportArketa";
import Settings from "./pages/Settings";
import ImageStudio from "./pages/ImageStudio";
import ClientPipeline from "./pages/ClientPipeline";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Index />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="leads" element={<Leads />} />
              <Route path="students" element={<Students />} />
              <Route path="intro-offers" element={<IntroOffers />} />
              <Route path="communication" element={<CommunicationHub />} />
              <Route path="sequences" element={<MessageSequences />} />
              <Route path="sequence-builder" element={<SequenceBuilder />} />
              <Route path="message-approval" element={<MessageApproval />} />
              <Route path="marketing" element={<MarketingHub />} />
              <Route path="instructors" element={<InstructorHub />} />
              <Route path="import" element={<ImportArketa />} />
              <Route path="settings" element={<Settings />} />
              <Route path="image-studio" element={<ImageStudio />} />
              <Route path="client-pipeline" element={<ClientPipeline />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
