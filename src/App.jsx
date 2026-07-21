import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { hasAdminAccess } from '@/lib/access-control';
import { Button } from '@/components/ui/button';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Public layout
import PublicLayout from '@/components/public/PublicLayout';
// Admin layout
import AdminLayout from '@/components/admin/AdminLayout';
// Portal layout
import PortalLayout from '@/components/portal/PortalLayout';
// Public pages
import Home from '@/pages/public/Home';
import About from '@/pages/public/About';
import Products from '@/pages/public/Products';
import Farms from '@/pages/public/Farms';
import Sustainability from '@/pages/public/Sustainability';
import ExportPage from '@/pages/public/Export';
import LocalSupply from '@/pages/public/LocalSupply';
import Media from '@/pages/public/Media';
import News from '@/pages/public/News';
import NewsDetail from '@/pages/public/NewsDetail';
import Careers from '@/pages/public/Careers';
import Contact from '@/pages/public/Contact';
// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import CRM from '@/pages/admin/CRM';
import Sales from '@/pages/admin/Sales';
import Orders from '@/pages/admin/Orders';
import Inventory from '@/pages/admin/Inventory';
import Harvests from '@/pages/admin/Harvests';
import FarmDailyActivities from '@/pages/admin/FarmDailyActivities';
import Logistics from '@/pages/admin/Logistics';
import Procurement from '@/pages/admin/Procurement';
import Finance from '@/pages/admin/Finance';
import ExportOps from '@/pages/admin/ExportOps';
import HR from '@/pages/admin/HR';
import Applications from '@/pages/admin/Applications';
import Content from '@/pages/admin/Content';
import Documents from '@/pages/admin/Documents';
import Reports from '@/pages/admin/Reports';
import SettingsPage from '@/pages/admin/SettingsPage';
// Portal pages
import PortalDashboard from '@/pages/portal/PortalDashboard';
import PortalOrders from '@/pages/portal/PortalOrders';
import PortalPayments from '@/pages/portal/PortalPayments';
import PortalDocuments from '@/pages/portal/PortalDocuments';

const AdminSignInRedirect = () => {
  const { navigateToLogin } = useAuth();

  useEffect(() => {
    navigateToLogin();
  }, [navigateToLogin]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
};

const AdminAccessDenied = () => (
  <div className="min-h-screen bg-muted/30 px-4 py-16">
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
      <h1 className="font-heading text-2xl font-semibold">Admin access required</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This workspace is only available to company staff and administrators.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to="/">Go to Website</Link>
        </Button>
      </div>
    </div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/farms" element={<Farms />} />
        <Route path="/sustainability" element={<Sustainability />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/local-supply" element={<LocalSupply />} />
        <Route path="/media" element={<Media />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Staff/admin workspace */}
      <Route
        element={(
          <ProtectedRoute
            canAccess={hasAdminAccess}
            unauthenticatedElement={<AdminSignInRedirect />}
            unauthorizedElement={<AdminAccessDenied />}
          />
        )}
      >
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="crm" element={<CRM />} />
          <Route path="sales" element={<Sales />} />
          <Route path="orders" element={<Orders />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="harvests" element={<Harvests />} />
          <Route path="farm-daily-activities" element={<FarmDailyActivities />} />
          <Route path="logistics" element={<Logistics />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="finance" element={<Finance />} />
          <Route path="export-ops" element={<ExportOps />} />
          <Route path="hr" element={<HR />} />
          <Route path="applications" element={<Applications />} />
          <Route path="content" element={<Content />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Customer portal */}
      <Route path="/portal" element={<PortalLayout />}>
        <Route index element={<PortalDashboard />} />
        <Route path="orders" element={<PortalOrders />} />
        <Route path="payments" element={<PortalPayments />} />
        <Route path="documents" element={<PortalDocuments />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
