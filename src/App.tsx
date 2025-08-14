import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageLoader from "@/components/layout/PageLoader";

// Lazy load all page components for code splitting and improved initial bundle size
// Each page will be loaded on-demand when the route is accessed
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Leads = lazy(() => import("./pages/Leads"));
const ImportArketa = lazy(() => import("./pages/ImportArketa"));
const ImageStudio = lazy(() => import("./pages/ImageStudio"));
const MarketingHub = lazy(() => import("./pages/MarketingHub"));
const InstructorHub = lazy(() => import("./pages/InstructorHub"));
const MessageSequences = lazy(() => import("./pages/MessageSequences"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Preload critical routes on app initialization
// This happens after the main bundle loads but before user navigation
if (typeof window !== "undefined") {
  // Preload the most commonly accessed pages
  setTimeout(() => {
    import("./pages/Dashboard");
    import("./pages/Customers");
  }, 1000);
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          {/* Wrap Routes in Suspense for lazy loading with a fallback loader */}
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/settings" element={<Settings />} />
              <Route path="/customer/:id" element={<CustomerDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
