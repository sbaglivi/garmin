import { useState } from 'react';
import {
    type UserProfile,
    DistanceUnit,
    DayOfWeek,
    ConfirmationStatus,
    EquipmentAccess,
    type BeginnerFitness,
    type IntermediateFitness,
    type StrengthProfile,
} from '../types';

const getTomorrowDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
};

const getMinRaceDate = (firstTrainingDate: string): string => {
    const date = new Date(firstTrainingDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
};

const INITIAL_PROFILE: UserProfile = {
    name: '',
    age: 0,
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
    strength: undefined,
    goal: {
        type: '5k',
        goal_type: 'finish',
    },
    first_training_date: getTomorrowDate(),
};

type Page = 'personal' | 'fitness' | 'logistics' | 'goal';
const PAGES: Page[] = ['personal', 'fitness', 'logistics', 'goal'];
const PAGE_TITLES: Record<Page, string> = {
    personal: 'Personal Details',
    fitness: 'Fitness Level',
    logistics: 'Logistics & Strength',
    goal: 'Goal',
};

export default function UserProfileForm() {
    const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
    const [currentPage, setCurrentPage] = useState<Page>('personal');
    const [hasInjuryHistory, setHasInjuryHistory] = useState(false);
    const [wantsStrengthTraining, setWantsStrengthTraining] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof UserProfile, value: unknown) => {
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
        const digits = value.replace(/\D/g, '');

        if (format === 'MM:SS') {
            const truncated = digits.slice(0, 4);
            if (truncated.length <= 2) return truncated;
            return `${truncated.slice(0, 2)}:${truncated.slice(2)}`;
        } else {
            const truncated = digits.slice(0, 6);
            if (truncated.length <= 2) return truncated;
            if (truncated.length <= 4) return `${truncated.slice(0, 2)}:${truncated.slice(2)}`;
            return `${truncated.slice(0, 2)}:${truncated.slice(2, 4)}:${truncated.slice(4)}`;
        }
    };

    const validatePersonalPage = (): Record<string, string> => {
        const newErrors: Record<string, string> = {};
        if (!profile.name.trim()) newErrors.name = 'Name is required';
        if (profile.age <= 0) newErrors.age = 'Age must be greater than 0';
        return newErrors;
    };

    const validateFitnessPage = (): Record<string, string> => {
        const newErrors: Record<string, string> = {};

        if (profile.fitness.level === 'beginner') {
            const fitness = profile.fitness as BeginnerFitness;
            if (!fitness.general_activity_level) newErrors.general_activity_level = 'Activity level is required';
            if (!fitness.can_run_nonstop_30min) newErrors.can_run_nonstop_30min = 'Please answer this question';
        } else {
            const fitness = profile.fitness as IntermediateFitness;
            if (fitness.average_weekly_distance <= 0) newErrors.average_weekly_distance = 'Distance must be positive';
            if (fitness.current_longest_run <= 0) newErrors.current_longest_run = 'Distance must be positive';

            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            if (fitness.recent_race_time && !timeRegex.test(fitness.recent_race_time)) {
                newErrors.recent_race_time = 'Format must be HH:MM:SS';
            }

            const paceRegex = /^\d{2}:\d{2}$/;
            if (fitness.easy_run_pace && !paceRegex.test(fitness.easy_run_pace)) {
                newErrors.easy_run_pace = 'Format must be MM:SS';
            }
        }

        return newErrors;
    };

    const validateLogisticsPage = (): Record<string, string> => {
        const newErrors: Record<string, string> = {};

        if (!profile.first_training_date) {
            newErrors.first_training_date = 'First training date is required';
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const trainingDate = new Date(profile.first_training_date);
            if (trainingDate <= today) {
                newErrors.first_training_date = 'First training date must be in the future';
            }
        }

        if (profile.logistics.days_available.length === 0) {
            newErrors.days_available = 'Select at least one available day';
        }
        if (profile.logistics.long_run_day === '' as DayOfWeek) {
            newErrors.long_run_day = 'Select a day for your long run';
        }

        if (wantsStrengthTraining && profile.strength) {
            if (!profile.strength.equipment_access) {
                newErrors.equipment_access = 'Equipment access is required';
            }
            if (!profile.strength.sessions_per_week || profile.strength.sessions_per_week < 1 || profile.strength.sessions_per_week > 3) {
                newErrors.sessions_per_week = 'Sessions per week must be between 1 and 3';
            }
        }

        return newErrors;
    };

    const validateGoalPage = (): Record<string, string> => {
        const newErrors: Record<string, string> = {};

        const isRaceGoal = profile.goal.type !== 'fitness_maintenance' && profile.goal.type !== 'base_building';
        if (isRaceGoal && profile.goal.race_date && profile.first_training_date) {
            const raceDate = new Date(profile.goal.race_date);
            const trainingDate = new Date(profile.first_training_date);
            if (raceDate <= trainingDate) {
                newErrors.race_date = 'Race date must be after first training date';
            }
        }

        if (profile.goal.goal_type === 'specific_time_target') {
            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            if (!profile.goal.target_time_str) {
                newErrors.target_time_str = 'Target time is required';
            } else if (!timeRegex.test(profile.goal.target_time_str)) {
                newErrors.target_time_str = 'Format must be HH:MM:SS';
            }
        }

        return newErrors;
    };

    const validateCurrentPage = (): boolean => {
        let pageErrors: Record<string, string> = {};

        switch (currentPage) {
            case 'personal':
                pageErrors = validatePersonalPage();
                break;
            case 'fitness':
                pageErrors = validateFitnessPage();
                break;
            case 'logistics':
                pageErrors = validateLogisticsPage();
                break;
            case 'goal':
                pageErrors = validateGoalPage();
                break;
        }

        setErrors(pageErrors);
        return Object.keys(pageErrors).length === 0;
    };

    const handleNext = () => {
        if (validateCurrentPage()) {
            const currentIndex = PAGES.indexOf(currentPage);
            if (currentIndex < PAGES.length - 1) {
                setCurrentPage(PAGES[currentIndex + 1]);
            }
        }
    };

    const handleBack = () => {
        const currentIndex = PAGES.indexOf(currentPage);
        if (currentIndex > 0) {
            setErrors({});
            setCurrentPage(PAGES[currentIndex - 1]);
        }
    };

    const handleSubmit = () => {
        if (validateCurrentPage()) {
            console.log('Submitted Profile:', profile);
            alert('Profile submitted! Check console for data.');
        }
    };

    const toggleDayAvailable = (day: DayOfWeek) => {
        const currentDays = profile.logistics.days_available;
        let newDays: DayOfWeek[];

        if (currentDays.includes(day)) {
            newDays = currentDays.filter(d => d !== day);
            if (profile.logistics.long_run_day === day) {
                handleChange('logistics', { ...profile.logistics, days_available: newDays, long_run_day: '' as DayOfWeek });
                return;
            }
        } else {
            newDays = [...currentDays, day];
        }

        handleChange('logistics', { ...profile.logistics, days_available: newDays });
    };

    const currentPageIndex = PAGES.indexOf(currentPage);
    const isFirstPage = currentPageIndex === 0;
    const isLastPage = currentPageIndex === PAGES.length - 1;

    const renderPersonalPage = () => (
        <div className="space-y-4">
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
                        value={profile.age || ''}
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
        </div>
    );

    const renderFitnessPage = () => (
        <div className="space-y-6">
            {/* Injury History */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Health</h3>
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

            {/* Fitness Level */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Fitness Level</h3>
                <div className="flex space-x-4 mb-4">
                    <button
                        type="button"
                        onClick={() => handleChange('fitness', { ...INITIAL_PROFILE.fitness, level: 'beginner' })}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${profile.fitness.level === 'beginner'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
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
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
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
                                <option value="sedentary">Sedentary - Minimal daily activity, mostly sitting</option>
                                <option value="lightly_active">Lightly Active - Light activity daily, 1-3 short sessions/week</option>
                                <option value="moderately_active">Moderately Active - 3-4 workouts/week or active job</option>
                                <option value="very_active">Very Active - Daily intense workouts or demanding physical job</option>
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
                                value={(profile.fitness as IntermediateFitness).average_weekly_distance || ''}
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
                                value={(profile.fitness as IntermediateFitness).current_longest_run || ''}
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
            </div>
        </div>
    );

    const renderLogisticsPage = () => (
        <div className="space-y-6">
            {/* Schedule */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Schedule</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Training Date</label>
                    <input
                        type="date"
                        value={profile.first_training_date}
                        onChange={(e) => handleChange('first_training_date', e.target.value)}
                        min={getTomorrowDate()}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.first_training_date && <p className="text-red-500 text-xs mt-1">{errors.first_training_date}</p>}
                </div>

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
                    {errors.long_run_day && <p className="text-red-500 text-xs mt-1">{errors.long_run_day}</p>}
                </div>
            </div>

            {/* Strength Training */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Strength Training</h3>

                <div className="flex items-center">
                    <input
                        id="wants_strength_training"
                        type="checkbox"
                        checked={wantsStrengthTraining}
                        onChange={(e) => {
                            setWantsStrengthTraining(e.target.checked);
                            if (e.target.checked) {
                                handleChange('strength', {
                                    equipment_access: EquipmentAccess.BODYWEIGHT_ONLY,
                                    sessions_per_week: 1,
                                } as StrengthProfile);
                            } else {
                                handleChange('strength', undefined);
                            }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="wants_strength_training" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Include strength training in my plan
                    </label>
                </div>

                {wantsStrengthTraining && profile.strength && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Equipment Access</label>
                            <select
                                value={profile.strength.equipment_access}
                                onChange={(e) => handleChange('strength', { ...profile.strength, equipment_access: e.target.value as EquipmentAccess })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value={EquipmentAccess.BODYWEIGHT_ONLY}>Bodyweight Only</option>
                                <option value={EquipmentAccess.DUMBBELLS_KETTLEBELLS}>Dumbbells / Kettlebells</option>
                                <option value={EquipmentAccess.FULL_GYM}>Full Gym</option>
                            </select>
                            {errors.equipment_access && <p className="text-red-500 text-xs mt-1">{errors.equipment_access}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sessions Per Week</label>
                            <select
                                value={profile.strength.sessions_per_week}
                                onChange={(e) => handleChange('strength', { ...profile.strength, sessions_per_week: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value={1}>1 session</option>
                                <option value={2}>2 sessions</option>
                                <option value={3}>3 sessions</option>
                            </select>
                            {errors.sessions_per_week && <p className="text-red-500 text-xs mt-1">{errors.sessions_per_week}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderGoalPage = () => (
        <div className="space-y-4">
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Date (optional)</label>
                            <input
                                type="date"
                                min={getMinRaceDate(profile.first_training_date)}
                                value={profile.goal.race_date || ''}
                                onChange={(e) => handleChange('goal', { ...profile.goal, race_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            {errors.race_date && <p className="text-red-500 text-xs mt-1">{errors.race_date}</p>}
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
        </div>
    );

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'personal':
                return renderPersonalPage();
            case 'fitness':
                return renderFitnessPage();
            case 'logistics':
                return renderLogisticsPage();
            case 'goal':
                return renderGoalPage();
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">User Profile</h1>

            {/* Progress indicator */}
            <div className="mb-6">
                <div className="flex justify-between mb-2">
                    {PAGES.map((page, index) => (
                        <div
                            key={page}
                            className={`flex-1 text-center text-xs font-medium ${index <= currentPageIndex
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-400 dark:text-gray-500'
                                }`}
                        >
                            {PAGE_TITLES[page]}
                        </div>
                    ))}
                </div>
                <div className="flex space-x-1">
                    {PAGES.map((page, index) => (
                        <div
                            key={page}
                            className={`flex-1 h-2 rounded-full ${index <= currentPageIndex
                                ? 'bg-blue-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()} onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isLastPage) {
                        handleSubmit();
                    } else {
                        handleNext();
                    }
                }
            }}>
                <section className="space-y-4 min-h-[300px]">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">
                        {PAGE_TITLES[currentPage]}
                    </h2>
                    {renderCurrentPage()}
                </section>

                <div className="flex justify-between pt-6 mt-6 border-t">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={isFirstPage}
                        className={`px-6 py-2 rounded-md font-semibold transition-colors ${isFirstPage
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Back
                    </button>

                    <button
                        type="button"
                        onClick={isLastPage ? handleSubmit : handleNext}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        {isLastPage ? 'Submit Profile' : 'Next'}
                    </button>
                </div>
            </form>
        </div>
    );
}
