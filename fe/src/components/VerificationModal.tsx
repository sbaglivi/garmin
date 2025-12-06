import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Proposal {
    description: string;
    reason: string;
    new_goal?: {
        type: string;
        goal_type: string;
        race_date?: string;
        target_time_str?: string;
    };
    new_days_per_week?: number;
}

interface VerificationResult {
    outcome: 'ok' | 'warning' | 'rejected';
    message: string;
    proposals: Proposal[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAcceptProposal: (proposal: Proposal) => void;
    onContinueAnyway: () => void;
}

export default function VerificationModal({ isOpen, onClose, onAcceptProposal, onContinueAnyway }: Props) {
    const { token } = useAuth();
    const [status, setStatus] = useState<'pending' | 'completed' | 'error'>('pending');
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setStatus('pending');
            setResult(null);
            setError(null);
            return;
        }

        const pollVerification = async () => {
            try {
                const response = await fetch('http://localhost:8000/profiles/verification', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch verification status');
                }

                const data = await response.json();

                if (data.status === 'completed') {
                    setStatus('completed');
                    setResult(data.result);
                } else if (data.status === 'error') {
                    setStatus('error');
                    setError(data.result?.error || 'Verification failed');
                }
                // If still pending, keep polling
            } catch (err) {
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Unknown error');
            }
        };

        // Start polling
        pollVerification();
        const interval = setInterval(() => {
            if (status === 'pending') {
                pollVerification();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isOpen, token, status]);

    if (!isOpen) return null;

    const outcomeStyles = {
        ok: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Approved' },
        warning: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Warning' },
        rejected: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Not Recommended' },
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Pending State */}
                {status === 'pending' && (
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-100 mb-2">Analyzing Your Profile</h3>
                        <p className="text-neutral-400 text-sm">
                            Our AI coach is reviewing your goals and fitness level...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-100 mb-2">Verification Error</h3>
                        <p className="text-neutral-400 text-sm mb-6">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}

                {/* Completed State */}
                {status === 'completed' && result && (
                    <div className="p-6">
                        {/* Header with outcome badge */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 ${outcomeStyles[result.outcome].bg} rounded-full flex items-center justify-center`}>
                                {result.outcome === 'ok' && (
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                {result.outcome === 'warning' && (
                                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                )}
                                {result.outcome === 'rejected' && (
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <span className={`text-xs font-medium ${outcomeStyles[result.outcome].text} uppercase tracking-wide`}>
                                    {outcomeStyles[result.outcome].label}
                                </span>
                                <h3 className="text-lg font-semibold text-neutral-100">Coach Assessment</h3>
                            </div>
                        </div>

                        {/* Message */}
                        <p className="text-neutral-300 text-sm mb-6 leading-relaxed">{result.message}</p>

                        {/* Proposals */}
                        {result.proposals.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-neutral-400 mb-3">Suggested Adjustments</h4>
                                <div className="space-y-2">
                                    {result.proposals.map((proposal, index) => (
                                        <button
                                            key={index}
                                            onClick={() => onAcceptProposal(proposal)}
                                            className="w-full text-left p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                                        >
                                            <p className="text-neutral-100 font-medium text-sm">{proposal.description}</p>
                                            <p className="text-neutral-400 text-xs mt-1">{proposal.reason}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            {result.outcome === 'ok' ? (
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-900 font-medium rounded-lg transition-colors"
                                >
                                    Continue
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium rounded-lg transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                    {result.outcome === 'warning' && (
                                        <button
                                            onClick={onContinueAnyway}
                                            className="flex-1 px-5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-medium rounded-lg transition-colors"
                                        >
                                            Continue Anyway
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
