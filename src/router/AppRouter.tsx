import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore';

const Dashboard = lazy(() => import('../screens/Dashboard'));
const TodaySession = lazy(() => import('../screens/TodaySession'));
const DrillLibrary = lazy(() => import('../screens/DrillLibrary'));
const DrillDetail = lazy(() => import('../screens/DrillDetail'));
const WeeklySchedule = lazy(() => import('../screens/WeeklySchedule'));
const Progress = lazy(() => import('../screens/Progress'));
const KPITracker = lazy(() => import('../screens/KPITracker'));
const PhaseOverview = lazy(() => import('../screens/PhaseOverview'));
const MilestoneLog = lazy(() => import('../screens/MilestoneLog'));
const MentalGame = lazy(() => import('../screens/MentalGame'));
const TournamentPrep = lazy(() => import('../screens/TournamentPrep'));
const Settings = lazy(() => import('../screens/Settings'));
const Onboarding = lazy(() => import('../screens/Onboarding'));
const More = lazy(() => import('../screens/More'));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-chalk-300">
      Loading training workspace...
    </div>
  );
}

function GuardedRoutes() {
  const complete = useSettingsStore((s) => s.profile.onboardingComplete);

  if (!complete) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/today" element={<TodaySession />} />
        <Route path="/drills" element={<DrillLibrary />} />
        <Route path="/drills/:drillId" element={<DrillDetail />} />
        <Route path="/schedule" element={<WeeklySchedule />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/kpi" element={<KPITracker />} />
        <Route path="/phases" element={<PhaseOverview />} />
        <Route path="/milestones" element={<MilestoneLog />} />
        <Route path="/mental" element={<MentalGame />} />
        <Route path="/tournament" element={<TournamentPrep />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default GuardedRoutes;
