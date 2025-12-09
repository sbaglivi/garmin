import type { TrainingStrategy, UserProfile } from '../types';

interface Props {
    strategy: TrainingStrategy;
    profile: UserProfile;
    onViewWeeklyPlan?: () => void;
}

const phaseColors: Record<string, { bg: string; border: string; text: string }> = {
    Base: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
    Build: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
    Peak: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
    Taper: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
};

export default function TrainingPlanView({ strategy, profile, onViewWeeklyPlan}: Props) {
    const totalWeeks = strategy.phases.reduce((sum, p) => sum + p.duration_weeks, 0);
    const unit = profile.units === 'kilometers' ? 'km' : 'mi';

    return (
        <div className="max-w-2xl mx-auto bg-neutral-900 rounded-xl border border-neutral-800">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-neutral-100">
                            Your Training Plan
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            {totalWeeks} weeks to your goal
                        </p>
                    </div>
                    {onViewWeeklyPlan && (
                        <button
                            onClick={onViewWeeklyPlan}
                            className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                        >
                            View Weekly Plan
                        </button>
                    )}
                </div>
            </div>

            {/* Overview */}
            <div className="px-6 py-5 border-b border-neutral-800">
                <p className="text-neutral-300 leading-relaxed">{strategy.plan_overview}</p>
            </div>

            {/* Key Metrics */}
            <div className="px-6 py-5 border-b border-neutral-800">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-4">Target Metrics</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-800 rounded-lg p-4">
                        <p className="text-2xl font-bold text-amber-500">{strategy.target_peak_volume_km} {unit}</p>
                        <p className="text-sm text-neutral-400 mt-1">Peak Weekly Volume</p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-4">
                        <p className="text-2xl font-bold text-amber-500">{strategy.target_longest_run_km} {unit}</p>
                        <p className="text-sm text-neutral-400 mt-1">Longest Run</p>
                    </div>
                </div>
            </div>

            {/* Phase Timeline */}
            <div className="px-6 py-5">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-4">Training Phases</h2>

                {/* Visual timeline */}
                <div className="flex gap-1 mb-6 h-3 rounded-full overflow-hidden">
                    {strategy.phases.map((phase) => (
                        <div
                            key={phase.phase_name}
                            className={`${phaseColors[phase.phase_name].bg} ${phaseColors[phase.phase_name].border} border`}
                            style={{ flex: phase.duration_weeks }}
                            title={`${phase.phase_name}: ${phase.duration_weeks} weeks`}
                        />
                    ))}
                </div>

                {/* Phase details */}
                <div className="space-y-3">
                    {strategy.phases.map((phase, index) => {
                        const colors = phaseColors[phase.phase_name];
                        const startWeek = strategy.phases.slice(0, index).reduce((sum, p) => sum + p.duration_weeks, 1);
                        const endWeek = startWeek + phase.duration_weeks - 1;

                        return (
                            <div
                                key={phase.phase_name}
                                className={`${colors.bg} ${colors.border} border rounded-lg p-4`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className={`font-semibold ${colors.text}`}>{phase.phase_name}</h3>
                                    <span className="text-sm text-neutral-400">
                                        {phase.duration_weeks === 1
                                            ? `Week ${startWeek}`
                                            : `Weeks ${startWeek}-${endWeek}`}
                                        {' '}({phase.duration_weeks} {phase.duration_weeks === 1 ? 'week' : 'weeks'})
                                    </span>
                                </div>
                                <p className="text-neutral-300 text-sm">{phase.key_focus}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
