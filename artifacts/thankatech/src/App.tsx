import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Navbar } from "@/components/layout/Navbar";
import { Home } from "@/pages/home";
import { Browse } from "@/pages/browse";
import { TechnicianProfile } from "@/pages/technician-profile";
import { CustomerDashboard } from "@/pages/customer-dashboard";
import { TechnicianDashboard } from "@/pages/technician-dashboard";
import { ThankFlow } from "@/pages/thank-flow";
import { Login, Onboard } from "@/pages/login";
import { RetryTip } from "@/pages/retry-tip";
import { JobDetail } from "@/pages/job-detail";
import { About } from "@/pages/about";
import { Terms } from "@/pages/terms";
import { Privacy } from "@/pages/privacy";
import { Admin } from "@/pages/admin";
import { Footer } from "@/components/layout/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/browse" component={Browse} />
          <Route path="/technician/dashboard">
            <ProtectedRoute requireProfile requireUserType="technician">
              <TechnicianDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/technician/:id" component={TechnicianProfile} />
          <Route path="/customer/dashboard">
            <ProtectedRoute requireProfile requireUserType="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/thank/:jobId">
            <ProtectedRoute requireProfile requireUserType="customer">
              <ThankFlow />
            </ProtectedRoute>
          </Route>
          <Route path="/retry-tip/:thankMessageId">
            <ProtectedRoute requireProfile requireUserType="customer">
              <RetryTip />
            </ProtectedRoute>
          </Route>
          <Route path="/jobs/:id">
            <ProtectedRoute requireProfile requireUserType="customer">
              <JobDetail />
            </ProtectedRoute>
          </Route>
          <Route path="/about" component={About} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/admin" component={Admin} />
          <Route path="/login" component={Login} />
          <Route path="/onboard">
            <ProtectedRoute>
              <Onboard />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
