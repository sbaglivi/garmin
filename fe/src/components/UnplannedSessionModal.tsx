import { useState } from 'react';
import type { UnplannedSession, IntervalSet, RunType } from '../types';

interface Props {
    date: string;
    onSave: (session: UnplannedSession) => void;
    onClose: () => void;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const RUN_TYPES: { value: RunType; label: string }[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'recovery', label: 'Recovery' },
    { value: 'long_run', label: 'Long Run' },
    { value: 'tempo', label: 'Tempo' },
    { value: 'interval', label: 'Interval' },
    { value: 'fartlek', label: 'Fartlek' },
];

export default function UnplannedSessionModal({ date, onSave, onClose }: Props) {
    const [distance, setDistance] = useState<string>('');
    const [durationMinutes, setDurationMinutes] = useState<string>('');
    const [avgPace, setAvgPace] = useState<string>('');
    const [runType, setRunType] = useState<RunType | null>(null);
    const [notes, setNotes] = useState('');
    const [hasIntervals, setHasIntervals] = useState(false);
    const [intervals, setIntervals] = useState<IntervalSet[]>([]);

    const handleAddInterval = () => {
        setIntervals([...intervals, { reps: 1, distance_meters: 400 }]);
    };

    const handleRemoveInterval = (index: number) => {
        setIntervals(intervals.filter((_, i) => i !== index));
    };

    const handleUpdateInterval = (index: number, field: keyof IntervalSet, value: string | number) => {
        const updated = [...intervals];
        updated[index] = { ...updated[index], [field]: value };
        setIntervals(updated);
    };

    const handleSave = () => {
        if (!distance) return;

        const session: UnplannedSession = {
            id: `unplanned-${date}-${Date.now()}`,
            date,
            distance_km: parseFloat(distance),
            duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
            avgPace: avgPace || undefined,
            run_type: runType || undefined,
            intervals: hasIntervals && intervals.length > 0 ? intervals : undefined,
            notes: notes.trim() || undefined,
        };
        onSave(session);
    };

    const isValid = distance && parseFloat(distance) > 0;

    const inputClass = "w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";
    const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5";

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-5 border-b border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-100">Log Unplanned Session</h2>
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

                {/* Form */}
                <div className="px-6 py-5 space-y-5">
                    {/* Run Type */}
                    <div>
                        <label className={labelClass}>Run Type (optional)</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {RUN_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setRunType(runType === type.value ? null : type.value)}
                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                                        runType === type.value
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Distance */}
                    <div>
                        <label className={labelClass}>Distance (km) *</label>
                        <input
                            type="number"
                            step="0.1"
                            value={distance}
                            onChange={e => setDistance(e.target.value)}
                            placeholder="e.g. 5.5"
                            className={inputClass}
                        />
                    </div>

                    {/* Duration and Pace */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Duration (minutes)</label>
                            <input
                                type="number"
                                value={durationMinutes}
                                onChange={e => setDurationMinutes(e.target.value)}
                                placeholder="e.g. 30"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Avg Pace (MM:SS/km)</label>
                            <input
                                type="text"
                                value={avgPace}
                                onChange={e => setAvgPace(e.target.value)}
                                placeholder="e.g. 5:30"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Intervals Toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasIntervals}
                                onChange={e => setHasIntervals(e.target.checked)}
                                className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm font-medium text-neutral-300">Include intervals</span>
                        </label>
                    </div>

                    {/* Intervals */}
                    {hasIntervals && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className={labelClass}>Interval Sets</label>
                                <button
                                    type="button"
                                    onClick={handleAddInterval}
                                    className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                                >
                                    + Add Set
                                </button>
                            </div>

                            {intervals.length === 0 ? (
                                <p className="text-sm text-neutral-500 text-center py-4 bg-neutral-800/50 rounded-lg">
                                    No intervals added. Click "Add Set" to add interval details.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {intervals.map((interval, index) => (
                                        <div key={index} className="bg-neutral-800/50 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-neutral-300">Set {index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveInterval(index)}
                                                    className="text-neutral-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-neutral-500">Reps</label>
                                                    <input
                                                        type="number"
                                                        value={interval.reps}
                                                        onChange={e => handleUpdateInterval(index, 'reps', parseInt(e.target.value) || 1)}
                                                        className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-neutral-500">Distance (m)</label>
                                                    <input
                                                        type="number"
                                                        value={interval.distance_meters}
                                                        onChange={e => handleUpdateInterval(index, 'distance_meters', parseInt(e.target.value) || 100)}
                                                        className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-neutral-500">Target Pace</label>
                                                    <input
                                                        type="text"
                                                        value={interval.targetPace || ''}
                                                        onChange={e => handleUpdateInterval(index, 'targetPace', e.target.value)}
                                                        placeholder="MM:SS"
                                                        className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-100 placeholder-neutral-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-neutral-500">Recovery (sec)</label>
                                                    <input
                                                        type="number"
                                                        value={interval.recoverySeconds || ''}
                                                        onChange={e => handleUpdateInterval(index, 'recoverySeconds', e.target.value ? parseInt(e.target.value) : 0)}
                                                        placeholder="e.g. 90"
                                                        className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-neutral-100 placeholder-neutral-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Any notes about the session..."
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
                        disabled={!isValid}
                        className="flex-1 py-2.5 px-4 bg-amber-500 text-neutral-900 font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Session
                    </button>
                </div>
            </div>
        </div>
    );
}
