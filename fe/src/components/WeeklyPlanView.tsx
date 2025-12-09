import { useState } from 'react';
import type { WeeklySchedule, RunningSession, StrengthSession, Exercise, DayOfWeek } from '../types';

interface Props {
    schedule: WeeklySchedule;
    onViewMacroPlan?: () => void;
}

const DAY_ORDER: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

function RunningSessionCard({ session }: { session: RunningSession }) {
    const colors = runTypeColors[session.run_type] || runTypeColors.easy;

    return (
        <div className={`${colors.bg} border border-neutral-700 rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${colors.text}`}>
                    {formatRunType(session.run_type)}
                </span>
                <span className="text-lg font-bold text-neutral-100">
                    {session.distance_km} km
                </span>
            </div>
            <p className="text-neutral-300 text-sm">{session.workout_description}</p>
            {session.notes && (
                <p className="text-neutral-500 text-xs mt-2 italic">{session.notes}</p>
            )}
        </div>
    );
}

function ExerciseItem({ exercise }: { exercise: Exercise }) {
    const formatSetsReps = () => {
        if (exercise.hold) {
            return `${exercise.series} x ${exercise.hold}s hold`;
        }
        if (exercise.reps) {
            return `${exercise.series} x ${exercise.reps} reps`;
        }
        return `${exercise.series} sets`;
    };

    return (
        <div className="bg-neutral-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-neutral-100 font-medium text-sm">{exercise.name}</span>
                <span className="text-amber-400 text-sm">{formatSetsReps()}</span>
            </div>
            <p className="text-neutral-400 text-xs">{exercise.form_cues}</p>
            {exercise.weight && (
                <span className="text-neutral-500 text-xs">Weight: {exercise.weight}kg</span>
            )}
        </div>
    );
}

function StrengthSessionCard({ session }: { session: StrengthSession }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-cyan-500/20 border border-neutral-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-cyan-400">Strength Training</span>
                <span className="text-neutral-300 text-sm">{session.duration_minutes} min</span>
            </div>
            <button
                onClick={() => setExpanded(!expanded)}
                className="text-neutral-400 text-sm hover:text-neutral-200 transition-colors"
            >
                {expanded ? 'Hide exercises' : `Show ${session.exercises.length} exercises`}
            </button>
            {expanded && (
                <div className="mt-3 space-y-2">
                    {session.exercises.map((exercise, idx) => (
                        <ExerciseItem key={idx} exercise={exercise} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function WeeklyPlanView({ schedule, onViewMacroPlan }: Props) {
    // Group sessions by day
    const sessionsByDay = new Map<DayOfWeek, { running?: RunningSession; strength?: StrengthSession }>();

    // Initialize all days
    DAY_ORDER.forEach(day => {
        sessionsByDay.set(day, {});
    });

    // Populate running sessions
    schedule.running_sessions.forEach(session => {
        const existing = sessionsByDay.get(session.day) || {};
        sessionsByDay.set(session.day, { ...existing, running: session });
    });

    // Populate strength sessions
    schedule.strength_sessions.forEach(session => {
        const existing = sessionsByDay.get(session.day) || {};
        sessionsByDay.set(session.day, { ...existing, strength: session });
    });

    const totalVolume = schedule.running_sessions.reduce((sum, s) => sum + s.distance_km, 0);

    return (
        <div className="max-w-2xl mx-auto bg-neutral-900 rounded-xl border border-neutral-800">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-neutral-100">
                            Week {schedule.week_number}
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            {schedule.phase_name} Phase
                        </p>
                    </div>
                    {onViewMacroPlan && (
                        <button
                            onClick={onViewMacroPlan}
                            className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                        >
                            View Full Plan
                        </button>
                    )}
                </div>
            </div>

            {/* Overview */}
            <div className="px-6 py-4 border-b border-neutral-800">
                <p className="text-neutral-300 text-sm leading-relaxed">{schedule.week_overview}</p>
            </div>

            {/* Weekly Stats */}
            <div className="px-6 py-4 border-b border-neutral-800">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-amber-500">{totalVolume}</p>
                        <p className="text-xs text-neutral-500">Total km</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">{schedule.weekly_long_run_target}</p>
                        <p className="text-xs text-neutral-500">Long Run km</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-neutral-300">{schedule.running_sessions.length}</p>
                        <p className="text-xs text-neutral-500">Runs</p>
                    </div>
                </div>
            </div>

            {/* Daily Schedule */}
            <div className="px-6 py-4">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-4">Daily Schedule</h2>
                <div className="space-y-3">
                    {DAY_ORDER.map(day => {
                        const sessions = sessionsByDay.get(day);
                        const hasActivity = sessions?.running || sessions?.strength;

                        return (
                            <div key={day} className="flex gap-4">
                                <div className="w-20 flex-shrink-0 pt-4">
                                    <span className={`text-sm font-medium ${hasActivity ? 'text-neutral-200' : 'text-neutral-600'}`}>
                                        {day.slice(0, 3)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    {hasActivity ? (
                                        <div className="space-y-2">
                                            {sessions?.running && <RunningSessionCard session={sessions.running} />}
                                            {sessions?.strength && <StrengthSessionCard session={sessions.strength} />}
                                        </div>
                                    ) : (
                                        <div className="bg-neutral-800/30 border border-neutral-800 rounded-lg p-4 text-center">
                                            <span className="text-neutral-600 text-sm">Rest Day</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
