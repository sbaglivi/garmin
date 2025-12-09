import { useState, useMemo } from 'react';
import type { WeeklySchedule, SessionFeedback, UnplannedSession, CalendarSession } from '../types';
import SessionFeedbackModal from './SessionFeedbackModal';
import UnplannedSessionModal from './UnplannedSessionModal';

interface Props {
    weeklySchedules: WeeklySchedule[];
    planStartDate: string; // ISO date YYYY-MM-DD (Monday of week 1)
}

interface CalendarDay {
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    weekNumber: number | null; // Which week of the plan this day belongs to (1-indexed), null if not in plan
    sessions: CalendarSession[];
}

const runTypeColors: Record<string, { bg: string; border: string; text: string }> = {
    easy: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
    recovery: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
    long_run: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
    tempo: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400' },
    interval: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
    fartlek: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400' },
    race_simulation: { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-400' },
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatRunType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getDayOfWeekIndex(day: string): number {
    const days: Record<string, number> = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
    };
    return days[day] ?? 0;
}

function getMonthCalendarDays(year: number, month: number, planStartDate: Date, weeklySchedules: WeeklySchedule[], feedbackMap: Map<string, SessionFeedback>, unplannedMap: Map<string, UnplannedSession[]>): CalendarDay[] {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getDateString(today);

    // First day of the month
    const firstOfMonth = new Date(year, month, 1);
    // Get the day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    // We want Monday=0, so adjust
    let startDayOfWeek = firstOfMonth.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes 6

    // Last day of month
    const lastOfMonth = new Date(year, month + 1, 0);

    // Start from the Monday of the first week
    const startDate = addDays(firstOfMonth, -startDayOfWeek);

    // End on Sunday of the last week
    let endDayOfWeek = lastOfMonth.getDay() - 1;
    if (endDayOfWeek < 0) endDayOfWeek = 6;
    const daysToAdd = 6 - endDayOfWeek;
    const endDate = addDays(lastOfMonth, daysToAdd);

    // Build sessions map by date
    const sessionsMap = new Map<string, CalendarSession[]>();

    // Calculate which weeks are visible based on current date
    const currentWeekNumber = Math.floor((today.getTime() - planStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    weeklySchedules.forEach((schedule) => {
        // Only show sessions for weeks that have started (week 1 is visible immediately, then each subsequent week)
        if (schedule.week_number > currentWeekNumber) return;

        const weekStartDate = addDays(planStartDate, (schedule.week_number - 1) * 7);

        schedule.running_sessions.forEach((session) => {
            const dayIndex = getDayOfWeekIndex(session.day);
            const sessionDate = addDays(weekStartDate, dayIndex);
            const dateStr = getDateString(sessionDate);

            const existing = sessionsMap.get(dateStr) || [];
            existing.push({
                type: 'planned',
                date: dateStr,
                runningSession: session,
                feedback: feedbackMap.get(dateStr),
            });
            sessionsMap.set(dateStr, existing);
        });

        schedule.strength_sessions.forEach((session) => {
            const dayIndex = getDayOfWeekIndex(session.day);
            const sessionDate = addDays(weekStartDate, dayIndex);
            const dateStr = getDateString(sessionDate);

            const existing = sessionsMap.get(dateStr) || [];
            // Check if there's already a planned session for this day
            const existingPlanned = existing.find(s => s.type === 'planned');
            if (existingPlanned) {
                existingPlanned.strengthSession = session;
            } else {
                existing.push({
                    type: 'planned',
                    date: dateStr,
                    strengthSession: session,
                });
            }
            sessionsMap.set(dateStr, existing);
        });
    });

    // Add unplanned sessions
    unplannedMap.forEach((sessions, dateStr) => {
        const existing = sessionsMap.get(dateStr) || [];
        sessions.forEach(session => {
            existing.push({
                type: 'unplanned',
                date: dateStr,
                unplannedSession: session,
            });
        });
        sessionsMap.set(dateStr, existing);
    });

    // Generate calendar days
    let currentDate = startDate;
    while (currentDate <= endDate) {
        const dateStr = getDateString(currentDate);
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === todayStr;
        const isPast = currentDate < today;

        // Calculate week number for this date
        const daysSincePlanStart = Math.floor((currentDate.getTime() - planStartDate.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = daysSincePlanStart >= 0 ? Math.floor(daysSincePlanStart / 7) + 1 : null;

        days.push({
            date: new Date(currentDate),
            dateStr,
            isCurrentMonth,
            isToday,
            isPast,
            weekNumber: weekNumber && weekNumber <= weeklySchedules.length ? weekNumber : null,
            sessions: sessionsMap.get(dateStr) || [],
        });

        currentDate = addDays(currentDate, 1);
    }

    return days;
}

function CalendarSessionCard({ session, compact, onClick }: { session: CalendarSession; compact?: boolean; onClick: () => void }) {
    if (session.unplannedSession) {
        return (
            <button
                onClick={onClick}
                className={`w-full text-left bg-neutral-600/30 border border-neutral-600/50 rounded px-1.5 py-0.5 ${compact ? 'text-xs' : 'text-sm'} text-neutral-300 hover:bg-neutral-600/50 transition-colors truncate`}
            >
                {compact ? `${session.unplannedSession.distance_km}km` : `Unplanned: ${session.unplannedSession.distance_km}km`}
            </button>
        );
    }

    if (session.runningSession) {
        const colors = runTypeColors[session.runningSession.run_type] || runTypeColors.easy;
        const hasFeedback = !!session.feedback;

        return (
            <button
                onClick={onClick}
                className={`w-full text-left ${colors.bg} border ${colors.border} rounded px-1.5 py-0.5 ${compact ? 'text-xs' : 'text-sm'} ${colors.text} hover:opacity-80 transition-opacity truncate flex items-center gap-1`}
            >
                {compact ? (
                    <span>{session.runningSession.distance_km}km</span>
                ) : (
                    <span>{formatRunType(session.runningSession.run_type)} {session.runningSession.distance_km}km</span>
                )}
                {hasFeedback && <span className="text-green-400">✓</span>}
            </button>
        );
    }

    if (session.strengthSession) {
        return (
            <button
                onClick={onClick}
                className={`w-full text-left bg-cyan-500/20 border border-cyan-500/40 rounded px-1.5 py-0.5 ${compact ? 'text-xs' : 'text-sm'} text-cyan-400 hover:opacity-80 transition-opacity truncate`}
            >
                {compact ? 'Strength' : `Strength ${session.strengthSession.duration_minutes}min`}
            </button>
        );
    }

    return null;
}

export default function CalendarView({ weeklySchedules, planStartDate }: Props) {
    const planStart = useMemo(() => new Date(planStartDate), [planStartDate]);

    // State for current month view
    const [viewDate, setViewDate] = useState(() => new Date());

    // State for feedback and unplanned sessions (local state for now, will be synced with backend later)
    const [feedbackMap, setFeedbackMap] = useState<Map<string, SessionFeedback>>(new Map());
    const [unplannedMap, setUnplannedMap] = useState<Map<string, UnplannedSession[]>>(new Map());

    // Modal state
    const [feedbackModalSession, setFeedbackModalSession] = useState<{ date: string; session: CalendarSession } | null>(null);
    const [unplannedModalDate, setUnplannedModalDate] = useState<string | null>(null);

    const calendarDays = useMemo(() => {
        return getMonthCalendarDays(
            viewDate.getFullYear(),
            viewDate.getMonth(),
            planStart,
            weeklySchedules,
            feedbackMap,
            unplannedMap
        );
    }, [viewDate, planStart, weeklySchedules, feedbackMap, unplannedMap]);

    const goToPreviousMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setViewDate(new Date());
    };

    const handleDayClick = (day: CalendarDay) => {
        if (day.sessions.length === 0) {
            // Empty day - open unplanned session modal
            setUnplannedModalDate(day.dateStr);
        }
    };

    const handleSessionClick = (day: CalendarDay, session: CalendarSession) => {
        if (session.type === 'planned' && session.runningSession) {
            // Open feedback modal for planned running sessions
            setFeedbackModalSession({ date: day.dateStr, session });
        } else if (session.type === 'unplanned') {
            // Could edit unplanned session - for now just show feedback modal
            setFeedbackModalSession({ date: day.dateStr, session });
        }
    };

    const handleSaveFeedback = (feedback: SessionFeedback) => {
        setFeedbackMap(prev => {
            const next = new Map(prev);
            next.set(feedback.sessionDate, feedback);
            return next;
        });
        setFeedbackModalSession(null);
    };

    const handleSaveUnplannedSession = (session: UnplannedSession) => {
        setUnplannedMap(prev => {
            const next = new Map(prev);
            const existing = next.get(session.date) || [];
            next.set(session.date, [...existing, session]);
            return next;
        });
        setUnplannedModalDate(null);
    };

    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    return (
        <div className="max-w-4xl mx-auto bg-neutral-900 rounded-xl border border-neutral-800">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold text-neutral-100">
                            {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </h1>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={goToPreviousMonth}
                                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-2 py-1 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                            >
                                Today
                            </button>
                            <button
                                onClick={goToNextMonth}
                                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_NAMES.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-neutral-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar weeks */}
                <div className="space-y-1">
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 gap-1">
                            {week.map(day => (
                                <div
                                    key={day.dateStr}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        min-h-[80px] p-1 rounded-lg border cursor-pointer transition-colors
                                        ${day.isCurrentMonth ? 'bg-neutral-800/50' : 'bg-neutral-900'}
                                        ${day.isToday ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-neutral-800'}
                                        ${day.isPast && !day.isToday ? 'opacity-50' : ''}
                                        ${day.sessions.length === 0 ? 'hover:bg-neutral-800' : ''}
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm ${day.isToday ? 'text-amber-400 font-bold' : day.isCurrentMonth ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                            {day.date.getDate()}
                                        </span>
                                        {day.weekNumber && (
                                            <span className="text-xs text-neutral-600">W{day.weekNumber}</span>
                                        )}
                                    </div>
                                    <div className="space-y-0.5">
                                        {day.sessions.slice(0, 3).map((session, idx) => (
                                            <CalendarSessionCard
                                                key={idx}
                                                session={session}
                                                compact
                                                onClick={() => handleSessionClick(day, session)}
                                            />
                                        ))}
                                        {day.sessions.length > 3 && (
                                            <span className="text-xs text-neutral-500">+{day.sessions.length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 border-t border-neutral-800">
                <div className="flex flex-wrap gap-3 text-xs">
                    {Object.entries(runTypeColors).map(([type, colors]) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded ${colors.bg} border ${colors.border}`}></div>
                            <span className="text-neutral-400">{formatRunType(type)}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/40"></div>
                        <span className="text-neutral-400">Strength</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-neutral-600/30 border border-neutral-600/50"></div>
                        <span className="text-neutral-400">Unplanned</span>
                    </div>
                </div>
            </div>

            {/* Feedback Modal */}
            {feedbackModalSession && (
                <SessionFeedbackModal
                    date={feedbackModalSession.date}
                    session={feedbackModalSession.session}
                    existingFeedback={feedbackMap.get(feedbackModalSession.date)}
                    onSave={handleSaveFeedback}
                    onClose={() => setFeedbackModalSession(null)}
                />
            )}

            {/* Unplanned Session Modal */}
            {unplannedModalDate && (
                <UnplannedSessionModal
                    date={unplannedModalDate}
                    onSave={handleSaveUnplannedSession}
                    onClose={() => setUnplannedModalDate(null)}
                />
            )}
        </div>
    );
}
