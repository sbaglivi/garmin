import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'register';

const inputClass = "w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";
const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5";

export default function AuthPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (mode === 'register' && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(email, password);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
        setConfirmPassword('');
    };

    return (
        <div className="max-w-md w-full mx-auto bg-neutral-900 rounded-xl border border-neutral-800">
            <div className="px-6 py-5 border-b border-neutral-800">
                <h1 className="text-xl font-semibold text-neutral-100">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                    {mode === 'login'
                        ? 'Sign in to access your training plan'
                        : 'Get started with your personalized training'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
                <div>
                    <label className={labelClass}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div>
                    <label className={labelClass}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                        placeholder="••••••••"
                        required
                    />
                </div>

                {mode === 'register' && (
                    <div>
                        <label className={labelClass}>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputClass}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                )}

                {error && (
                    <p className="text-amber-500 text-sm">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2.5 bg-amber-500 text-neutral-900 font-medium rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-400'}`}
                >
                    {isLoading
                        ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                        : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div className="px-6 py-4 border-t border-neutral-800 text-center">
                <p className="text-sm text-neutral-400">
                    {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                    <button
                        type="button"
                        onClick={switchMode}
                        className="ml-1 text-amber-500 hover:text-amber-400 font-medium"
                    >
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
