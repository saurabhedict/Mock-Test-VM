import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import ProfilePage from "./pages/ProfilePage.tsx";
import VerifyOTPPage from "./pages/VerifyOTPPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import MyPurchasesPage from "./pages/MyPurchasesPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/exams/:examId" element={<TestListPage />} />
              <Route path="/test/:testId" element={<TestInterfacePage />} />
              <Route path="/results/:testId" element={<ResultsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-purchases" element={<MyPurchasesPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
