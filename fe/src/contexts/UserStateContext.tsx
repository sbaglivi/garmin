import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { UserState } from '../types';

const API_URL = 'http://localhost:8000';

interface UserStateContextType {
    userState: UserState | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    proceedWithPlan: () => Promise<void>;
}

const UserStateContext = createContext<UserStateContextType | null>(null);

export function UserStateProvider({ children }: { children: ReactNode }) {
    const { token, user } = useAuth();
    const [userState, setUserState] = useState<UserState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserState = useCallback(async () => {
        if (!token) {
            setUserState(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/user/state`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user state');
            }

            const data = await response.json();
            setUserState(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const proceedWithPlan = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/profiles/proceed`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to proceed');
            }

            // Refetch state to get updated status
            await fetchUserState();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        }
    }, [token, fetchUserState]);

    // Initial fetch when user is authenticated
    useEffect(() => {
        if (user) {
            fetchUserState();
        } else {
            setUserState(null);
            setIsLoading(false);
        }
    }, [user, fetchUserState]);

    // Polling for pending states
    useEffect(() => {
        if (!userState) return;

        const shouldPoll =
            userState.verification_status === 'pending' ||
            userState.macroplan_status === 'pending' ||
            userState.weekly_plan_status === 'pending';

        if (!shouldPoll) return;

        const interval = setInterval(fetchUserState, 2000);
        return () => clearInterval(interval);
    }, [userState, fetchUserState]);

    return (
        <UserStateContext.Provider value={{
            userState,
            isLoading,
            error,
            refetch: fetchUserState,
            proceedWithPlan
        }}>
            {children}
        </UserStateContext.Provider>
    );
}

export function useUserState() {
    const context = useContext(UserStateContext);
    if (!context) {
        throw new Error('useUserState must be used within a UserStateProvider');
    }
    return context;
}
