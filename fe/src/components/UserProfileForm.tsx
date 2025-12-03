import { useState } from 'react';
import {
    type UserProfile,
    DistanceUnit,
    DayOfWeek,
    ConfirmationStatus,
    type BeginnerFitness,
    type IntermediateFitness,
    type Goal,
} from '../types';

const INITIAL_PROFILE: UserProfile = {
    name: '',
    age: 30,
    biological_sex: 'prefer_not_to_say',
    units: DistanceUnit.KM,
    injury_history: '',
    fitness: {
        level: 'beginner',
        general_activity_level: null,
        can_run_nonstop_30min: null,
    } as BeginnerFitness,
    logistics: {
        days_available: [],
        long_run_day: '' as DayOfWeek,
    },
    goal: {
        type: 'fitness_maintenance',
        goal_type: 'finish',
    } as Goal,
};

export default function UserProfileForm() {
    const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
    const [hasInjuryHistory, setHasInjuryHistory] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof UserProfile | string, string>>>({});

    const handleChange = (field: keyof UserProfile, value: any) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const formatTime = (value: string, format: 'HH:MM:SS' | 'MM:SS') => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');

        if (format === 'MM:SS') {
            // Limit to 4 digits
            const truncated = digits.slice(0, 4);
            if (truncated.length <= 2) return truncated;
            return `${truncated.slice(0, 2)}:${truncated.slice(2)}`;
        } else {
            // Limit to 6 digits
            const truncated = digits.slice(0, 6);
            if (truncated.length <= 2) return truncated;
            if (truncated.length <= 4) return `${truncated.slice(0, 2)}:${truncated.slice(2)}`;
            return `${truncated.slice(0, 2)}:${truncated.slice(2, 4)}:${truncated.slice(4)}`;
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!profile.name.trim()) newErrors.name = 'Name is required';
        if (profile.age <= 0) newErrors.age = 'Age must be greater than 0';

        if (profile.fitness.level === 'beginner') {
            const fitness = profile.fitness as BeginnerFitness;
            if (!fitness.general_activity_level) newErrors.general_activity_level = 'Activity level is required';
            if (!fitness.can_run_nonstop_30min) newErrors.can_run_nonstop_30min = 'Please answer this question';
        } else {
            const fitness = profile.fitness as IntermediateFitness;
            if (fitness.average_weekly_distance < 0) newErrors.average_weekly_distance = 'Distance cannot be negative';
            if (fitness.current_longest_run < 0) newErrors.current_longest_run = 'Distance cannot be negative';

            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            if (fitness.recent_race_time && !timeRegex.test(fitness.recent_race_time)) {
                newErrors.recent_race_time = 'Format must be HH:MM:SS';
            }

            const paceRegex = /^\d{2}:\d{2}$/;
            if (fitness.easy_run_pace && !paceRegex.test(fitness.easy_run_pace)) {
                newErrors.easy_run_pace = 'Format must be MM:SS';
            }
        }

        if (profile.logistics.days_available.length === 0) {
            newErrors.days_available = 'Select at least one available day';
        }

        if (profile.goal.type !== 'fitness_maintenance' && profile.goal.type !== 'base_building') {
            if (!profile.goal.race_date) newErrors.race_date = 'Race date is required for this goal';
        }

        if (profile.goal.goal_type === 'specific_time_target') {
            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            if (!profile.goal.target_time_str) {
                newErrors.target_time_str = 'Target time is required';
            } else if (!timeRegex.test(profile.goal.target_time_str)) {
                newErrors.target_time_str = 'Format must be HH:MM:SS';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            console.log('Submitted Profile:', profile);
            alert('Profile submitted! Check console for data.');
        }
    };

    const toggleDayAvailable = (day: DayOfWeek) => {
        const currentDays = profile.logistics.days_available;
        let newDays: DayOfWeek[];

        if (currentDays.includes(day)) {
            newDays = currentDays.filter(d => d !== day);
            // If the removed day was the long run day, clear it
            if (profile.logistics.long_run_day === day) {
                handleChange('logistics', { ...profile.logistics, days_available: newDays, long_run_day: '' as DayOfWeek });
                return;
            }
        } else {
            newDays = [...currentDays, day];
        }

        handleChange('logistics', { ...profile.logistics, days_available: newDays });
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">User Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Personal Details Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">Personal Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Your Name"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                            <input
                                type="number"
                                value={profile.age}
                                onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biological Sex</label>
                            <select
                                value={profile.biological_sex}
                                onChange={(e) => handleChange('biological_sex', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Units</label>
                            <div className="flex space-x-4 mt-2">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        value={DistanceUnit.KM}
                                        checked={profile.units === DistanceUnit.KM}
                                        onChange={() => handleChange('units', DistanceUnit.KM)}
                                        className="form-radio text-blue-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">Kilometers</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        value={DistanceUnit.MILES}
                                        checked={profile.units === DistanceUnit.MILES}
                                        onChange={() => handleChange('units', DistanceUnit.MILES)}
                                        className="form-radio text-blue-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">Miles</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Health Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">Health</h2>

                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                id="has_injury_history"
                                type="checkbox"
                                checked={hasInjuryHistory}
                                onChange={(e) => {
                                    setHasInjuryHistory(e.target.checked);
                                    if (!e.target.checked) {
                                        handleChange('injury_history', '');
                                    }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="has_injury_history" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Have you ever been injured before?
                            </label>
                        </div>

                        {/* Injury History - Visible if checked */}
                        {hasInjuryHistory && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Injury History</label>
                                <textarea
                                    value={profile.injury_history || ''}
                                    onChange={(e) => handleChange('injury_history', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Please describe past injuries or issues (knees, shins, etc)..."
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Fitness Level Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">Fitness Level</h2>

                    <div className="flex space-x-4 mb-4">
                        <button
                            type="button"
                            onClick={() => handleChange('fitness', { ...INITIAL_PROFILE.fitness, level: 'beginner' })}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${profile.fitness.level === 'beginner'
                                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                        >
                            Beginner
                        </button>
                        <button
                            type="button"
                            onClick={() => handleChange('fitness', {
                                level: 'intermediate',
                                average_weekly_distance: 0,
                                current_longest_run: 0
                            } as IntermediateFitness)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${profile.fitness.level !== 'beginner'
                                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                        >
                            Intermediate / Advanced
                        </button>
                    </div>

                    {profile.fitness.level === 'beginner' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">General Activity Level</label>
                                <select
                                    value={(profile.fitness as BeginnerFitness).general_activity_level || ''}
                                    onChange={(e) => handleChange('fitness', { ...profile.fitness, general_activity_level: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select Activity Level</option>
                                    <option value="sedentary">Sedentary (Desk job, no sports)</option>
                                    <option value="lightly_active">Lightly Active</option>
                                    <option value="moderately_active">Moderately Active</option>
                                    <option value="very_active">Very Active (Manual labor or other sports)</option>
                                </select>
                                {errors.general_activity_level && <p className="text-red-500 text-xs mt-1">{errors.general_activity_level}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Can you run for 30 minutes non-stop?</label>
                                <div className="flex space-x-4 mt-2">
                                    {[ConfirmationStatus.YES, ConfirmationStatus.NO, ConfirmationStatus.MAYBE].map((status) => (
                                        <label key={status} className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                value={status}
                                                checked={(profile.fitness as BeginnerFitness).can_run_nonstop_30min === status}
                                                onChange={() => handleChange('fitness', { ...profile.fitness, can_run_nonstop_30min: status })}
                                                className="form-radio text-blue-600"
                                            />
                                            <span className="ml-2 text-gray-700 dark:text-gray-300 capitalize">{status}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.can_run_nonstop_30min && <p className="text-red-500 text-xs mt-1">{errors.can_run_nonstop_30min}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Average Weekly Distance ({profile.units})
                                </label>
                                <input
                                    type="number"
                                    value={(profile.fitness as IntermediateFitness).average_weekly_distance}
                                    onChange={(e) => handleChange('fitness', { ...profile.fitness, average_weekly_distance: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.average_weekly_distance && <p className="text-red-500 text-xs mt-1">{errors.average_weekly_distance}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Longest Run ({profile.units})
                                </label>
                                <input
                                    type="number"
                                    value={(profile.fitness as IntermediateFitness).current_longest_run}
                                    onChange={(e) => handleChange('fitness', { ...profile.fitness, current_longest_run: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.current_longest_run && <p className="text-red-500 text-xs mt-1">{errors.current_longest_run}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Race Time (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    value={(profile.fitness as IntermediateFitness).recent_race_time || ''}
                                    onChange={(e) => handleChange('fitness', { ...profile.fitness, recent_race_time: formatTime(e.target.value, 'HH:MM:SS') })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="00:00:00"
                                />
                                {errors.recent_race_time && <p className="text-red-500 text-xs mt-1">{errors.recent_race_time}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Easy Run Pace (MM:SS /{profile.units === DistanceUnit.KM ? 'km' : 'mi'})</label>
                                <input
                                    type="text"
                                    value={(profile.fitness as IntermediateFitness).easy_run_pace || ''}
                                    onChange={(e) => handleChange('fitness', { ...profile.fitness, easy_run_pace: formatTime(e.target.value, 'MM:SS') })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="00:00"
                                />
                                {errors.easy_run_pace && <p className="text-red-500 text-xs mt-1">{errors.easy_run_pace}</p>}
                            </div>
                        </div>
                    )}
                </section>

                {/* Logistics Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">Logistics</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Days Available to Train</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(DayOfWeek).map((day) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDayAvailable(day)}
                                    className={`px-3 py-1 rounded-full text-sm border font-medium transition-all ${profile.logistics.days_available.includes(day)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        {errors.days_available && <p className="text-red-500 text-xs mt-1">{errors.days_available}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Long Run Day</label>
                        <select
                            value={profile.logistics.long_run_day}
                            onChange={(e) => handleChange('logistics', { ...profile.logistics, long_run_day: e.target.value as DayOfWeek })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select Long Run Day</option>
                            {profile.logistics.days_available.map((day) => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* Goal Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">Goal</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Type</label>
                            <select
                                value={profile.goal.type}
                                onChange={(e) => handleChange('goal', { ...profile.goal, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="5k">5k</option>
                                <option value="10k">10k</option>
                                <option value="half_marathon">Half Marathon</option>
                                <option value="marathon">Marathon</option>
                                <option value="fitness_maintenance">Fitness Maintenance</option>
                                <option value="base_building">Base Building</option>
                            </select>
                        </div>

                        {(profile.goal.type !== 'fitness_maintenance' && profile.goal.type !== 'base_building') && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Date (DD-MM-YYYY)</label>
                                    <input
                                        type="date"
                                        value={profile.goal.race_date || ''}
                                        onChange={(e) => handleChange('goal', { ...profile.goal, race_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                    {errors.race_date && <p className="text-red-500 text-xs mt-1">{errors.race_date}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target</label>
                                    <select
                                        value={profile.goal.goal_type}
                                        onChange={(e) => handleChange('goal', { ...profile.goal, goal_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="finish">Finish</option>
                                        <option value="improve_speed">Improve Speed</option>
                                        <option value="specific_time_target">Specific Time Target</option>
                                    </select>
                                </div>

                                {profile.goal.goal_type === 'specific_time_target' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Time (HH:MM:SS)</label>
                                        <input
                                            type="text"
                                            value={profile.goal.target_time_str || ''}
                                            onChange={(e) => handleChange('goal', { ...profile.goal, target_time_str: formatTime(e.target.value, 'HH:MM:SS') })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="00:00:00"
                                        />
                                        {errors.target_time_str && <p className="text-red-500 text-xs mt-1">{errors.target_time_str}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        Submit Profile
                    </button>
                </div>
            </form>
        </div>
    );
}
