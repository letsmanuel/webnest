import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import ViewWebsite from "./pages/ViewWebsite";
import { Collaborate } from "./pages/Collaborate";
import Referral from "./pages/Referral";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { PaymentCancel } from "./pages/PaymentCancel";
import DocsPage from "./pages/DocsPage";
import NotFound from "./pages/NotFound";
import Marketplace from './pages/marketplace';
import MarketplaceUpload from './pages/marketplace-upload';
import MarketplaceProduct from './pages/marketplace-product-[websiteid]';
import AdminPanel from './pages/admin';
import EditorPage from './pages/EditorPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/view/:id" element={<ViewWebsite />} />
              <Route path="/collaborate/:websiteId" element={<Collaborate />} />
              <Route path="/refferal/:userid" element={<Referral />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              <Route path="/docs/:article" element={<DocsPage />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/upload" element={<MarketplaceUpload />} />
              <Route path="/marketplace/product/:websiteid" element={<MarketplaceProduct />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/editor/:id" element={<EditorPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
