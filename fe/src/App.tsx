import { useState } from 'react';
import UserProfileForm from './components/UserProfileForm';
import AuthPage from './components/AuthPage';
import TrainingPlanView from './components/TrainingPlanView';
import WeeklyPlanView from './components/WeeklyPlanView';
import CalendarView from './components/CalendarView';
import PendingView from './components/PendingView';
import VerificationStatus from './components/VerificationStatus';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserStateProvider, useUserState } from './contexts/UserStateContext';
import type { Proposal, UserProfile, TrainingStrategy, VerificationResult, WeeklySchedule } from './types';
import { profileToInput } from './types';
import './App.css';

type View = 'profile-form' | 'verification-pending' | 'verification-result' | 'macroplan-pending' | 'weekly-plan-pending' | 'weekly-plan' | 'training-plan' | 'calendar';

function determineView(userState: ReturnType<typeof useUserState>['userState']): View {
  if (!userState || !userState.has_profile) {
    return 'profile-form';
  }

  // Check verification status
  if (userState.verification_status === 'pending') {
    return 'verification-pending';
  }

  if (userState.verification_status === 'completed') {
    const outcome = userState.verification_result?.outcome;

    // If verification has warning/rejected and no macroplan yet, show verification result
    if ((outcome === 'warning' || outcome === 'rejected') && !userState.macroplan_status) {
      return 'verification-result';
    }

    // If macroplan is pending, show loading
    if (userState.macroplan_status === 'pending') {
      return 'macroplan-pending';
    }

    // If macroplan completed, check weekly plan status
    if (userState.macroplan_status === 'completed') {
      // If weekly plan is pending, show loading
      if (userState.weekly_plan_status === 'pending') {
        return 'weekly-plan-pending';
      }

      // If weekly plan is ready, show it
      if (userState.weekly_plan_status === 'completed' && userState.weekly_schedules?.length) {
        return 'weekly-plan';
      }
    }

    // If verification ok but macroplan not started (shouldn't happen normally)
    if (outcome === 'ok' && !userState.macroplan_status) {
      return 'macroplan-pending';
    }
  }

  // Default to profile form
  return 'profile-form';
}

function MainContent() {
  const { user, logout } = useAuth();
  const { userState, isLoading, proceedWithPlan, refetch } = useUserState();
  const [editingProfile, setEditingProfile] = useState(false);
  const [currentView, setCurrentView] = useState<'calendar' | 'weekly' | 'macro'>('calendar');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 py-8 px-4 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <AuthPage />
        </div>
      </div>
    );
  }

  const baseView = determineView(userState);
  let view: View = baseView;
  if (!editingProfile && baseView === 'weekly-plan') {
    if (currentView === 'calendar') view = 'calendar';
    else if (currentView === 'macro') view = 'training-plan';
    else view = 'weekly-plan';
  } else if (editingProfile) {
    view = 'profile-form';
  }

  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  const handleProfileSubmitted = () => {
    setEditingProfile(false);
    refetch();
  };

  const handleAcceptProposal = (proposal: Proposal) => {
    // The user needs to edit their profile with the proposal
    // For now, just go to edit mode
    setEditingProfile(true);
    console.log('Proposal to apply:', proposal);
  };

  const handleContinueAnyway = async () => {
    try {
      await proceedWithPlan();
    } catch (err) {
      console.error('Failed to proceed:', err);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'profile-form':
        return <UserProfileForm onSubmitSuccess={handleProfileSubmitted} initialProfile={editingProfile && userState?.profile ? profileToInput(userState.profile) : undefined} />;

      case 'verification-pending':
        return (
          <PendingView
            title="Analyzing Your Profile"
            message="Our AI coach is reviewing your goals and fitness level..."
          />
        );

      case 'verification-result':
        if (!userState?.verification_result) return null;
        return (
          <VerificationStatus
            result={userState.verification_result as VerificationResult}
            onEditProfile={handleEditProfile}
            onAcceptProposal={handleAcceptProposal}
            onContinueAnyway={handleContinueAnyway}
          />
        );

      case 'macroplan-pending':
        return (
          <PendingView
            title="Creating Your Training Plan"
            message="Our AI coach is designing a personalized periodized plan for you..."
          />
        );

      case 'weekly-plan-pending':
        return (
          <PendingView
            title="Building Your First Week"
            message="Creating detailed workouts for your first week of training..."
          />
        );

      case 'calendar':
        if (!userState?.weekly_schedules?.length || !userState?.plan_start_date) return null;
        return (
          <CalendarView
            weeklySchedules={userState.weekly_schedules as WeeklySchedule[]}
            planStartDate={userState.plan_start_date}
          />
        );

      case 'weekly-plan':
        if (!userState?.weekly_schedules?.length) return null;
        return (
          <WeeklyPlanView
            schedule={userState.weekly_schedules[0] as WeeklySchedule}
          />
        );

      case 'training-plan':
        if (!userState?.training_overview || !userState?.profile) return null;
        return (
          <TrainingPlanView
            strategy={userState.training_overview as TrainingStrategy}
            profile={userState.profile as UserProfile}
          />
        );

      default:
        return null;
    }
  };

  // Show navbar only when we have a plan ready
  const showNavbar = baseView === 'weekly-plan' && !editingProfile;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {showNavbar ? (
        <Navbar
          currentView={currentView}
          onViewChange={setCurrentView}
          userEmail={user.email}
          onLogout={logout}
        />
      ) : (
        <div className="max-w-2xl mx-auto w-full py-4 px-4 flex justify-between items-center">
          <span className="text-sm text-neutral-400">{user.email}</span>
          <button
            onClick={logout}
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        {renderContent()}
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <UserStateProvider>
      <MainContent />
    </UserStateProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
