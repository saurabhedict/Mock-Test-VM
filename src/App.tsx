import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import AdminRoute from "./components/AdminRoute.tsx";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ExamsPage = lazy(() => import("./pages/ExamsPage.tsx"));
const TestListPage = lazy(() => import("./pages/TestListPage.tsx"));
const TestInterfacePage = lazy(() => import("./pages/TestInterfacePage.tsx"));
const ResultsPage = lazy(() => import("./pages/ResultsPage.tsx"));
const LoginPage = lazy(() => import("./pages/AuthPages.tsx"));
const RegisterPage = lazy(() =>
  import("./pages/AuthPages.tsx").then((module) => ({ default: module.RegisterPage })),
);
const ServicesPage = lazy(() => import("./pages/ServicesPage.tsx"));
const PlanDetails = lazy(() => import("./pages/PlanDetails.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const VerifyOTPPage = lazy(() => import("./pages/VerifyOTPPage.tsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const MyPurchasesPage = lazy(() => import("./pages/MyPurchasesPage.tsx"));
const MyResultsPage = lazy(() => import("./pages/MyResultsPage.tsx"));

const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard.tsx"));
const TestManager = lazy(() => import("./pages/Admin/TestManager.tsx"));
const QuestionEditor = lazy(() => import("./pages/Admin/QuestionEditor.tsx"));
const Monitoring = lazy(() => import("./pages/Admin/Monitoring.tsx"));
const PlanManager = lazy(() => import("./pages/Admin/PlanManager.tsx"));
const UserManager = lazy(() => import("./pages/UserManager.tsx"));
const CouponManager = lazy(() => import("./pages/Admin/CouponManager.tsx"));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-sm text-muted-foreground">
    Loading page...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/my-results" element={<MyResultsPage />} />
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
              <Route path="/admin/plans" element={<PlanManager />} />
              <Route path="/admin/users" element={<UserManager />} />
              <Route path="/admin/coupons" element={<CouponManager />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
