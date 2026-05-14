import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import MyListings from './pages/MyListings';
import Bookings from './pages/Bookings';
import Messages from './pages/Messages';
import AIAssistant from './pages/AIAssistant';
import AIInsights from './pages/AIInsights';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Navbar from './components/Navbar';
import ServiceDashboard from './pages/ServiceDashboard';

// // === Batch 09 Gaps & Frontend Mounts ===
const PredictiveBookingSuccessAvailabilityPricingCfs = React.lazy(() => import('./pages/Batch09/PredictiveBookingSuccessAvailabilityPricingCfs'));
const HostReliabilityPredictionCfs = React.lazy(() => import('./pages/Batch09/HostReliabilityPredictionCfs'));
const FraudDetectionInDisputesCfs = React.lazy(() => import('./pages/Batch09/FraudDetectionInDisputesCfs'));
const DynamicPricingByDemandseasonalityCfs = React.lazy(() => import('./pages/Batch09/DynamicPricingByDemandseasonalityCfs'));
const PropertyManagementSystemIntegrationCfs = React.lazy(() => import('./pages/Batch09/PropertyManagementSystemIntegrationCfs'));
const AiAutoReplyToInquiriesCfs = React.lazy(() => import('./pages/Batch09/AiAutoReplyToInquiriesCfs'));
const GuestCompatibilityScoringCfs = React.lazy(() => import('./pages/Batch09/GuestCompatibilityScoringCfs'));
const InsuranceClaimAutomationCfs = React.lazy(() => import('./pages/Batch09/InsuranceClaimAutomationCfs'));
const AiBackgroundCheckHostVettingGapAi = React.lazy(() => import('./pages/Batch09/AiBackgroundCheckHostVettingGapAi'));
const AiInquiryAutoResponderGapAi = React.lazy(() => import('./pages/Batch09/AiInquiryAutoResponderGapAi'));
const AiPhotoQualityScoringForListingsGapAi = React.lazy(() => import('./pages/Batch09/AiPhotoQualityScoringForListingsGapAi'));
const PaymentProcessingEscrowPayoutsGapNon = React.lazy(() => import('./pages/Batch09/PaymentProcessingEscrowPayoutsGapNon'));
const DisputeResolutionWorkflowGapNon = React.lazy(() => import('./pages/Batch09/DisputeResolutionWorkflowGapNon'));
const HostInsuranceDamageProtectionGapNon = React.lazy(() => import('./pages/Batch09/HostInsuranceDamageProtectionGapNon'));
const CalendarSyncWithExternalSystemsGapNon = React.lazy(() => import('./pages/Batch09/CalendarSyncWithExternalSystemsGapNon'));
const MultiLanguageSupportGapNon = React.lazy(() => import('./pages/Batch09/MultiLanguageSupportGapNon'));
const IdVerificationModuleGapNon = React.lazy(() => import('./pages/Batch09/IdVerificationModuleGapNon'));
const TaxDocumentGenerationForHostsGapNon = React.lazy(() => import('./pages/Batch09/TaxDocumentGenerationForHostsGapNon'));

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">{children}</main>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><AppLayout><Dashboard /></AppLayout></Protected>} />
        <Route path="/browse" element={<Protected><AppLayout><Browse /></AppLayout></Protected>} />
        <Route path="/browse/:category" element={<Protected><AppLayout><Browse /></AppLayout></Protected>} />
        <Route path="/my-listings" element={<Protected><AppLayout><MyListings /></AppLayout></Protected>} />
        <Route path="/bookings" element={<Protected><AppLayout><Bookings /></AppLayout></Protected>} />
        <Route path="/messages" element={<Protected><AppLayout><Messages /></AppLayout></Protected>} />
        <Route path="/ai" element={<Protected><AppLayout><AIAssistant /></AppLayout></Protected>} />
        <Route path="/ai-insights" element={<Protected><AppLayout><AIInsights /></AppLayout></Protected>} />
        <Route path="/profile" element={<Protected><AppLayout><Profile /></AppLayout></Protected>} />
        <Route path="/notifications" element={<Protected><AppLayout><Notifications /></AppLayout></Protected>} />
        <Route path="/services" element={<Protected><AppLayout><ServiceDashboard /></AppLayout></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      
      {/* // === Batch 09 Gaps & Frontend Mounts === */}
        <Route path="/batch09/cfs/predictive-booking-success-availability-pricing" element={<React.Suspense fallback={<div>Loading...</div>}><PredictiveBookingSuccessAvailabilityPricingCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/host-reliability-prediction" element={<React.Suspense fallback={<div>Loading...</div>}><HostReliabilityPredictionCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/fraud-detection-in-disputes" element={<React.Suspense fallback={<div>Loading...</div>}><FraudDetectionInDisputesCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/dynamic-pricing-by-demandseasonality" element={<React.Suspense fallback={<div>Loading...</div>}><DynamicPricingByDemandseasonalityCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/property-management-system-integration" element={<React.Suspense fallback={<div>Loading...</div>}><PropertyManagementSystemIntegrationCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/ai-auto-reply-to-inquiries" element={<React.Suspense fallback={<div>Loading...</div>}><AiAutoReplyToInquiriesCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/guest-compatibility-scoring" element={<React.Suspense fallback={<div>Loading...</div>}><GuestCompatibilityScoringCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/insurance-claim-automation" element={<React.Suspense fallback={<div>Loading...</div>}><InsuranceClaimAutomationCfs /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-background-check-host-vetting" element={<React.Suspense fallback={<div>Loading...</div>}><AiBackgroundCheckHostVettingGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-inquiry-auto-responder" element={<React.Suspense fallback={<div>Loading...</div>}><AiInquiryAutoResponderGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-photo-quality-scoring-for-listings" element={<React.Suspense fallback={<div>Loading...</div>}><AiPhotoQualityScoringForListingsGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/payment-processing-escrow-payouts" element={<React.Suspense fallback={<div>Loading...</div>}><PaymentProcessingEscrowPayoutsGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/dispute-resolution-workflow" element={<React.Suspense fallback={<div>Loading...</div>}><DisputeResolutionWorkflowGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/host-insurance-damage-protection" element={<React.Suspense fallback={<div>Loading...</div>}><HostInsuranceDamageProtectionGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/calendar-sync-with-external-systems" element={<React.Suspense fallback={<div>Loading...</div>}><CalendarSyncWithExternalSystemsGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/multi-language-support" element={<React.Suspense fallback={<div>Loading...</div>}><MultiLanguageSupportGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/id-verification-module" element={<React.Suspense fallback={<div>Loading...</div>}><IdVerificationModuleGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/tax-document-generation-for-hosts" element={<React.Suspense fallback={<div>Loading...</div>}><TaxDocumentGenerationForHostsGapNon /></React.Suspense>} />

      </Routes>
    </>
  );
}
