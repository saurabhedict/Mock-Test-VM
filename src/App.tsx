import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ExamsPage from "./pages/ExamsPage.tsx";
import TestListPage from "./pages/TestListPage.tsx";
import TestInterfacePage from "./pages/TestInterfacePage.tsx";
import ResultsPage from "./pages/ResultsPage.tsx";
import LoginPage, { RegisterPage } from "./pages/AuthPages.tsx";
import ServicesPage from "./pages/ServicesPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/exams/:examId" element={<TestListPage />} />
          <Route path="/test/:testId" element={<TestInterfacePage />} />
          <Route path="/results/:testId" element={<ResultsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
