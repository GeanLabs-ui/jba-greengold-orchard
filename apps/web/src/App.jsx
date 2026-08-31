import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from "react-hot-toast"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import SeoManager from './components/SeoManager';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageSkeleton from '@/components/shared/PageSkeleton';
import { hasAdminAccess } from '@/lib/access-control';
import { CartProvider } from '@/lib/CartContext';
import { Button } from '@/components/ui/button';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import AcceptStaffInvitation from '@/pages/AcceptStaffInvitation';
// Public layout
import PublicLayout from '@/components/public/PublicLayout';
// Admin layout
import AdminLayout from '@/components/admin/AdminLayout';
import FarmDailyActivitiesLayout from '@/components/admin/FarmDailyActivitiesLayout';
import DeploymentRecoveryBoundary from '@/components/shared/DeploymentRecoveryBoundary';
// Portal layout
import PortalLayout from '@/components/portal/PortalLayout';
// Public pages
const Home = lazy(() => import('@/pages/public/Home'));
const About = lazy(() => import('@/pages/public/About'));
const Products = lazy(() => import('@/pages/public/Products'));
const Cart = lazy(() => import('@/pages/public/Cart'));
const Checkout = lazy(() => import('@/pages/public/Checkout'));
const MyOrders = lazy(() => import('@/pages/public/MyOrders'));
const Farms = lazy(() => import('@/pages/public/Farms'));
const FarmDetail = lazy(() => import('@/pages/public/FarmDetail'));
const Sustainability = lazy(() => import('@/pages/public/Sustainability'));
const ExportPage = lazy(() => import('@/pages/public/Export'));
const LocalSupply = lazy(() => import('@/pages/public/LocalSupply'));
const Media = lazy(() => import('@/pages/public/Media'));
const News = lazy(() => import('@/pages/public/News'));
const NewsDetail = lazy(() => import('@/pages/public/NewsDetail'));
const Careers = lazy(() => import('@/pages/public/Careers'));
const Contact = lazy(() => import('@/pages/public/Contact'));
const Privacy = lazy(() => import('@/pages/public/Privacy'));
const Terms = lazy(() => import('@/pages/public/Terms'));
// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const CRM = lazy(() => import('@/pages/admin/CRM'));
const Inquiries = lazy(() => import('@/pages/admin/Inquiries'));
const Sales = lazy(() => import('@/pages/admin/Sales'));
const Orders = lazy(() => import('@/pages/admin/Orders'));
const Inventory = lazy(() => import('@/pages/admin/Inventory'));
const FarmProfileAdmin = lazy(() => import('@/pages/admin/FarmProfileAdmin'));
const BlockProfileAdmin = lazy(() => import('@/pages/admin/BlockProfileAdmin'));
const FarmDailyActivities = lazy(() => import('@/pages/admin/FarmDailyActivities'));
const MasterScheduleTask = lazy(() => import('@/pages/admin/MasterScheduleTask'));
const ProductionCalendar = lazy(() => import('@/pages/admin/ProductionCalendar'));
const Logistics = lazy(() => import('@/pages/admin/Logistics'));
const Procurement = lazy(() => import('@/pages/admin/Procurement'));
const Finance = lazy(() => import('@/pages/admin/Finance'));
const ExportOps = lazy(() => import('@/pages/admin/ExportOps'));
const HR = lazy(() => import('@/pages/admin/HR'));
const Applications = lazy(() => import('@/pages/admin/Applications'));
const Content = lazy(() => import('@/pages/admin/Content'));
const Documents = lazy(() => import('@/pages/admin/Documents'));
const Reports = lazy(() => import('@/pages/admin/Reports'));
const SystemLog = lazy(() => import('@/pages/admin/SystemLog'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
// Portal pages
const PortalDashboard = lazy(() => import('@/pages/portal/PortalDashboard'));
const PortalOrders = lazy(() => import('@/pages/portal/PortalOrders'));
const PortalPayments = lazy(() => import('@/pages/portal/PortalPayments'));
const PortalDocuments = lazy(() => import('@/pages/portal/PortalDocuments'));

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

const AdminAccessDenied = () => {
  const { logout } = useAuth();

  const switchAccount = async () => {
    await logout(false);
    window.location.assign('/login?from_url=/admin');
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">Admin access required</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in, but this account is not a company staff or administrator account.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={switchAccount}>Sign in with a staff Google account</Button>
          <Button asChild variant="outline">
            <Link to="/">Go to Website</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const waitsForIdentity = location.pathname === '/checkout'
    || location.pathname === '/my-orders'
    || location.pathname.startsWith('/portal')
    || location.pathname.startsWith('/admin');

  // Public and authentication pages can load while the session check runs.
  // Identity-sensitive routes retain the gate so protected content never flashes.
  if (waitsForIdentity && (isLoadingPublicSettings || isLoadingAuth)) {
    return <PageSkeleton fullPage />;
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
    <Suspense fallback={<PageSkeleton fullPage />}>
    <Routes>
      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/accept-staff-invite" element={<AcceptStaffInvitation />} />

      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/farms" element={<Farms />} />
        <Route path="/farms/:slug" element={<FarmDetail />} />
        <Route path="/sustainability" element={<Sustainability />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/local-supply" element={<LocalSupply />} />
        <Route path="/media" element={<Media />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
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
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="sales" element={<Sales />} />
          <Route path="orders" element={<Orders />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="farms" element={<Navigate to="/admin/farm-daily-activities/activities/farms" replace />} />
          <Route path="farms/:farmId" element={<FarmProfileAdmin />} />
          <Route path="farms/:farmId/blocks/:blockId" element={<BlockProfileAdmin />} />
          <Route path="harvests" element={<Navigate to="/admin/farm-daily-activities/activities/overview" replace />} />
          <Route path="farm-daily-activities" element={<FarmDailyActivitiesLayout />}>
            <Route index element={<FarmDailyActivities />} />
            <Route path="activities/farms/:farmId" element={<FarmProfileAdmin />} />
            <Route path="activities/farms/:farmId/blocks/:blockId" element={<BlockProfileAdmin />} />
            <Route path="activities/master-schedule/:taskId" element={<MasterScheduleTask />} />
            <Route path="harvests/*" element={<Navigate to="/admin/farm-daily-activities/activities/overview" replace />} />
            <Route path="*" element={<FarmDailyActivities />} />
          </Route>
          <Route path="calendar" element={<ProductionCalendar />} />
          <Route path="logistics" element={<Logistics />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="finance" element={<Finance />} />
          <Route path="export-ops" element={<ExportOps />} />
          <Route path="hr" element={<HR />} />
          <Route path="applications" element={<Applications />} />
          <Route path="content" element={<Content />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="system-log" element={<SystemLog />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Customer portal */}
      <Route element={<ProtectedRoute unauthenticatedElement={<AdminSignInRedirect />} unauthorizedElement={<AdminAccessDenied />} />}>
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<PortalDashboard />} />
          <Route path="orders" element={<PortalOrders />} />
          <Route path="payments" element={<PortalPayments />} />
          <Route path="documents" element={<PortalDocuments />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <CartProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <SeoManager />
            <DeploymentRecoveryBoundary>
              <AuthenticatedApp />
            </DeploymentRecoveryBoundary>
          </Router>
          <Toaster />
          <HotToaster position="top-right" />
        </QueryClientProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
