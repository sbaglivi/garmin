import { useState } from 'react';
import type { SessionFeedback, CalendarSession } from '../types';

interface Props {
    date: string;
    session: CalendarSession;
    existingFeedback?: SessionFeedback;
    onSave: (feedback: SessionFeedback) => void;
    onClose: () => void;
}

const runTypeColors: Record<string, { bg: string; text: string }> = {
    easy: { bg: 'bg-green-500/20', text: 'text-green-400' },
    recovery: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    long_run: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    tempo: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    interval: { bg: 'bg-red-500/20', text: 'text-red-400' },
    fartlek: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    race_simulation: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
};

function formatRunType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function SessionFeedbackModal({ date, session, existingFeedback, onSave, onClose }: Props) {
    const [avgHeartRate, setAvgHeartRate] = useState<string>(existingFeedback?.avgHeartRate?.toString() || '');
    const [maxHeartRate, setMaxHeartRate] = useState<string>(existingFeedback?.maxHeartRate?.toString() || '');
    const [perceivedExertion, setPerceivedExertion] = useState<number | null>(existingFeedback?.perceivedExertion || null);
    const [notes, setNotes] = useState(existingFeedback?.notes || '');
    const [completedAsPlanned, setCompletedAsPlanned] = useState(existingFeedback?.completedAsPlanned ?? true);

    const handleSave = () => {
        const feedback: SessionFeedback = {
            id: existingFeedback?.id || `feedback-${date}-${Date.now()}`,
            sessionDate: date,
            avgHeartRate: avgHeartRate ? parseInt(avgHeartRate) : undefined,
            maxHeartRate: maxHeartRate ? parseInt(maxHeartRate) : undefined,
            perceivedExertion: perceivedExertion || undefined,
            notes: notes.trim() || undefined,
            completedAsPlanned,
        };
        onSave(feedback);
    };

    const runningSession = session.runningSession;
    const colors = runningSession ? runTypeColors[runningSession.run_type] || runTypeColors.easy : null;

    const inputClass = "w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";
    const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5";

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-5 border-b border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-100">Session Feedback</h2>
                            <p className="text-sm text-neutral-500 mt-1">{formatDate(date)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-neutral-400 hover:text-neutral-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Session Info */}
                {runningSession && colors && (
                    <div className="px-6 py-4 border-b border-neutral-800">
                        <div className={`${colors.bg} border border-neutral-700 rounded-lg p-4`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${colors.text}`}>
                                    {formatRunType(runningSession.run_type)}
                                </span>
                                <span className="text-lg font-bold text-neutral-100">
                                    {runningSession.distance_km} km
                                </span>
                            </div>
                            <p className="text-neutral-300 text-sm">{runningSession.workout_description}</p>
                        </div>
                    </div>
                )}

                {session.unplannedSession && (
                    <div className="px-6 py-4 border-b border-neutral-800">
                        <div className="bg-neutral-600/30 border border-neutral-600/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-neutral-300">Unplanned Session</span>
                                <span className="text-lg font-bold text-neutral-100">
                                    {session.unplannedSession.distance_km} km
                                </span>
                            </div>
                            {session.unplannedSession.notes && (
                                <p className="text-neutral-400 text-sm">{session.unplannedSession.notes}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Feedback Form */}
                <div className="px-6 py-5 space-y-5">
                    {/* Completed as planned */}
                    <div>
                        <label className={labelClass}>Did you complete the session as planned?</label>
                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setCompletedAsPlanned(true)}
                                className={`flex-1 py-2.5 px-4 rounded-lg border transition-colors ${
                                    completedAsPlanned
                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                                }`}
                            >
                                Yes
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompletedAsPlanned(false)}
                                className={`flex-1 py-2.5 px-4 rounded-lg border transition-colors ${
                                    !completedAsPlanned
                                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                                }`}
                            >
                                No / Modified
                            </button>
                        </div>
                    </div>

                    {/* Heart Rate */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Avg Heart Rate (bpm)</label>
                            <input
                                type="number"
                                value={avgHeartRate}
                                onChange={e => setAvgHeartRate(e.target.value)}
                                placeholder="e.g. 145"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Max Heart Rate (bpm)</label>
                            <input
                                type="number"
                                value={maxHeartRate}
                                onChange={e => setMaxHeartRate(e.target.value)}
                                placeholder="e.g. 175"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Perceived Exertion */}
                    <div>
                        <label className={labelClass}>Perceived Exertion (1-10)</label>
                        <div className="flex gap-1.5 mt-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setPerceivedExertion(level)}
                                    className={`flex-1 py-2 rounded transition-colors text-sm font-medium ${
                                        perceivedExertion === level
                                            ? level <= 3 ? 'bg-green-500 text-neutral-900'
                                            : level <= 6 ? 'bg-amber-500 text-neutral-900'
                                            : 'bg-red-500 text-neutral-100'
                                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1.5 text-xs text-neutral-500">
                            <span>Easy</span>
                            <span>Moderate</span>
                            <span>Hard</span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="How did the session feel? Any issues or observations..."
                            rows={3}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-700 hover:bg-neutral-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 px-4 bg-amber-500 text-neutral-900 font-medium rounded-lg hover:bg-amber-400 transition-colors"
                    >
                        Save Feedback
                    </button>
                </div>
            </div>
        </div>
    );
}
