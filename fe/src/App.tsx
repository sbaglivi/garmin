import UserProfileForm from './components/UserProfileForm';
import AuthPage from './components/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function AppContent() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 py-8 px-4 flex flex-col">
      {user && (
        <div className="max-w-2xl mx-auto w-full mb-4 flex justify-between items-center">
          <span className="text-sm text-neutral-400">{user.email}</span>
          <button
            onClick={logout}
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        {user ? <UserProfileForm /> : <AuthPage />}
      </div>
    </div>
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
