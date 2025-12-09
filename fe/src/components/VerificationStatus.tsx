import type { VerificationResult, Proposal } from '../types';

interface Props {
    result: VerificationResult;
    onEditProfile: () => void;
    onAcceptProposal: (proposal: Proposal) => void;
    onContinueAnyway: () => void;
}

const outcomeStyles = {
    ok: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Approved' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Warning' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Not Recommended' },
};

export default function VerificationStatus({ result, onEditProfile, onAcceptProposal, onContinueAnyway }: Props) {
    const styles = outcomeStyles[result.outcome];

    return (
        <div className="max-w-lg mx-auto bg-neutral-900 rounded-xl border border-neutral-800 p-6">
            {/* Header with outcome badge */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${styles.bg} rounded-full flex items-center justify-center`}>
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
                    <span className={`text-xs font-medium ${styles.text} uppercase tracking-wide`}>
                        {styles.label}
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
                <button
                    onClick={onEditProfile}
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
            </div>
        </div>
    );
}
