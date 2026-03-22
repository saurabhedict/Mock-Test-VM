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
import PlanDetails from "./pages/PlanDetails.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import VerifyOTPPage from "./pages/VerifyOTPPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import MyPurchasesPage from "./pages/MyPurchasesPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

// Admin Imports
import AdminDashboard from "./pages/Admin/Dashboard.tsx";
import TestManager from "./pages/Admin/TestManager.tsx";
import QuestionEditor from "./pages/Admin/QuestionEditor.tsx";
import Monitoring from "./pages/Admin/Monitoring.tsx";

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
              <Route path="/plan/:id" element={<PlanDetails />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-purchases" element={<MyPurchasesPage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/tests" element={<TestManager />} />
              <Route path="/admin/tests/:testId/questions" element={<QuestionEditor />} />
              <Route path="/admin/monitoring" element={<Monitoring />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
