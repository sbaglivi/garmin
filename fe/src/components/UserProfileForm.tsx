import { useState, useEffect } from 'react';
import {
    type UserProfile,
    DistanceUnit,
    DayOfWeek,
    ConfirmationStatus,
    EquipmentAccess,
    RaceDistance,
    type BeginnerFitness,
    type IntermediateFitness,
    type StrengthProfile,
    type RecentRace,
} from '../types';
import { useAuth } from '../contexts/AuthContext';

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

// Shared styles
const inputClass = "w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";
const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5";
const sectionTitleClass = "text-base font-medium text-neutral-200 mb-3";

interface Props {
    onSubmitSuccess?: () => void;
    initialProfile?: UserProfile;
}

export default function UserProfileForm({ onSubmitSuccess, initialProfile }: Props) {
    const { token } = useAuth();
    const [profile, setProfile] = useState<UserProfile>(initialProfile || INITIAL_PROFILE);
    const [currentPage, setCurrentPage] = useState<Page>('personal');
    const [hasInjuryHistory, setHasInjuryHistory] = useState(!!initialProfile?.injury_history);
    const [wantsStrengthTraining, setWantsStrengthTraining] = useState(!!initialProfile?.strength);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update profile when initialProfile changes
    useEffect(() => {
        if (initialProfile) {
            setProfile(initialProfile);
            setHasInjuryHistory(!!initialProfile.injury_history);
            setWantsStrengthTraining(!!initialProfile.strength);
        }
    }, [initialProfile]);

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

            // Validate recent race - if one field is provided, both are required
            if (fitness.recent_race?.time || fitness.recent_race?.distance) {
                const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
                if (!fitness.recent_race?.time) {
                    newErrors.recent_race_time = 'Time is required when providing a race distance';
                } else if (!timeRegex.test(fitness.recent_race.time)) {
                    newErrors.recent_race_time = 'Format must be HH:MM:SS';
                }
                if (!fitness.recent_race?.distance) {
                    newErrors.recent_race_distance = 'Distance is required when providing a race time';
                }
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

    const handleSubmit = async () => {
        if (!validateCurrentPage()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:8000/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(profile),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to save profile');
            }

            onSubmitSuccess?.();
        } catch (error) {
            console.error('Submit error:', error);
            setErrors({ submit: error instanceof Error ? error.message : 'Failed to save profile' });
        } finally {
            setIsSubmitting(false);
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
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className={labelClass}>Name</label>
                    <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={inputClass}
                        placeholder="Your Name"
                    />
                    {errors.name && <p className="text-amber-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                    <label className={labelClass}>Age</label>
                    <input
                        type="number"
                        value={profile.age || ''}
                        onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                        className={inputClass}
                    />
                    {errors.age && <p className="text-amber-500 text-xs mt-1">{errors.age}</p>}
                </div>

                <div>
                    <label className={labelClass}>Biological Sex</label>
                    <select
                        value={profile.biological_sex}
                        onChange={(e) => handleChange('biological_sex', e.target.value)}
                        className={inputClass}
                    >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                </div>

                <div>
                    <label className={labelClass}>Units</label>
                    <div className="flex gap-4 mt-2">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                value={DistanceUnit.KM}
                                checked={profile.units === DistanceUnit.KM}
                                onChange={() => handleChange('units', DistanceUnit.KM)}
                                className="w-4 h-4 text-amber-500 bg-neutral-800 border-neutral-600 focus:ring-amber-500 focus:ring-offset-neutral-900"
                            />
                            <span className="ml-2 text-neutral-300">Kilometers</span>
                        </label>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                value={DistanceUnit.MILES}
                                checked={profile.units === DistanceUnit.MILES}
                                onChange={() => handleChange('units', DistanceUnit.MILES)}
                                className="w-4 h-4 text-amber-500 bg-neutral-800 border-neutral-600 focus:ring-amber-500 focus:ring-offset-neutral-900"
                            />
                            <span className="ml-2 text-neutral-300">Miles</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFitnessPage = () => (
        <div className="space-y-8">
            {/* Injury History */}
            <div className="space-y-4">
                <h3 className={sectionTitleClass}>Health</h3>
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
                        className="w-4 h-4 rounded bg-neutral-800 border-neutral-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900"
                    />
                    <label htmlFor="has_injury_history" className="ml-2 text-sm text-neutral-300 cursor-pointer">
                        Have you ever been injured before?
                    </label>
                </div>

                {hasInjuryHistory && (
                    <div>
                        <label className={labelClass}>Injury History</label>
                        <textarea
                            value={profile.injury_history || ''}
                            onChange={(e) => handleChange('injury_history', e.target.value)}
                            rows={3}
                            className={inputClass}
                            placeholder="Please describe past injuries or issues (knees, shins, etc)..."
                        />
                    </div>
                )}
            </div>

            {/* Fitness Level */}
            <div className="space-y-4">
                <h3 className={sectionTitleClass}>Fitness Level</h3>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleChange('fitness', { ...INITIAL_PROFILE.fitness, level: 'beginner' })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${profile.fitness.level === 'beginner'
                            ? 'bg-amber-500 text-neutral-900'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${profile.fitness.level !== 'beginner'
                            ? 'bg-amber-500 text-neutral-900'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                            }`}
                    >
                        Intermediate / Advanced
                    </button>
                </div>

                {profile.fitness.level === 'beginner' ? (
                    <div className="space-y-5">
                        <div>
                            <label className={labelClass}>General Activity Level</label>
                            <select
                                value={(profile.fitness as BeginnerFitness).general_activity_level || ''}
                                onChange={(e) => handleChange('fitness', { ...profile.fitness, general_activity_level: e.target.value })}
                                className={inputClass}
                            >
                                <option value="">Select Activity Level</option>
                                <option value="sedentary">Sedentary - Minimal daily activity, mostly sitting</option>
                                <option value="lightly_active">Lightly Active - Light activity daily, 1-3 short sessions/week</option>
                                <option value="moderately_active">Moderately Active - 3-4 workouts/week or active job</option>
                                <option value="very_active">Very Active - Daily intense workouts or demanding physical job</option>
                            </select>
                            {errors.general_activity_level && <p className="text-amber-500 text-xs mt-1">{errors.general_activity_level}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Can you run for 30 minutes non-stop?</label>
                            <div className="flex gap-4 mt-2">
                                {[ConfirmationStatus.YES, ConfirmationStatus.NO, ConfirmationStatus.MAYBE].map((status) => (
                                    <label key={status} className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            value={status}
                                            checked={(profile.fitness as BeginnerFitness).can_run_nonstop_30min === status}
                                            onChange={() => handleChange('fitness', { ...profile.fitness, can_run_nonstop_30min: status })}
                                            className="w-4 h-4 text-amber-500 bg-neutral-800 border-neutral-600 focus:ring-amber-500 focus:ring-offset-neutral-900"
                                        />
                                        <span className="ml-2 text-neutral-300 capitalize">{status}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.can_run_nonstop_30min && <p className="text-amber-500 text-xs mt-1">{errors.can_run_nonstop_30min}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>
                                Average Weekly Distance ({profile.units})
                            </label>
                            <input
                                type="number"
                                value={(profile.fitness as IntermediateFitness).average_weekly_distance || ''}
                                onChange={(e) => handleChange('fitness', { ...profile.fitness, average_weekly_distance: parseFloat(e.target.value) || 0 })}
                                className={inputClass}
                            />
                            {errors.average_weekly_distance && <p className="text-amber-500 text-xs mt-1">{errors.average_weekly_distance}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>
                                Longest Run ({profile.units})
                            </label>
                            <input
                                type="number"
                                value={(profile.fitness as IntermediateFitness).current_longest_run || ''}
                                onChange={(e) => handleChange('fitness', { ...profile.fitness, current_longest_run: parseFloat(e.target.value) || 0 })}
                                className={inputClass}
                            />
                            {errors.current_longest_run && <p className="text-amber-500 text-xs mt-1">{errors.current_longest_run}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Recent Race Distance</label>
                            <select
                                value={(profile.fitness as IntermediateFitness).recent_race?.distance || ''}
                                onChange={(e) => {
                                    const fitness = profile.fitness as IntermediateFitness;
                                    const newDistance = e.target.value as RaceDistance || undefined;
                                    const newRecentRace: RecentRace | undefined = newDistance || fitness.recent_race?.time
                                        ? { distance: newDistance as RaceDistance, time: fitness.recent_race?.time || '' }
                                        : undefined;
                                    handleChange('fitness', { ...fitness, recent_race: newRecentRace });
                                }}
                                className={inputClass}
                            >
                                <option value="">Select distance</option>
                                <option value={RaceDistance.FIVE_K}>5K</option>
                                <option value={RaceDistance.TEN_K}>10K</option>
                                <option value={RaceDistance.HALF_MARATHON}>Half Marathon</option>
                                <option value={RaceDistance.MARATHON}>Marathon</option>
                            </select>
                            {errors.recent_race_distance && <p className="text-amber-500 text-xs mt-1">{errors.recent_race_distance}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Recent Race Time (HH:MM:SS)</label>
                            <input
                                type="text"
                                value={(profile.fitness as IntermediateFitness).recent_race?.time || ''}
                                onChange={(e) => {
                                    const fitness = profile.fitness as IntermediateFitness;
                                    const newTime = formatTime(e.target.value, 'HH:MM:SS');
                                    const newRecentRace: RecentRace | undefined = newTime || fitness.recent_race?.distance
                                        ? { time: newTime, distance: fitness.recent_race?.distance as RaceDistance }
                                        : undefined;
                                    handleChange('fitness', { ...fitness, recent_race: newRecentRace });
                                }}
                                className={inputClass}
                                placeholder="00:00:00"
                            />
                            {errors.recent_race_time && <p className="text-amber-500 text-xs mt-1">{errors.recent_race_time}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Easy Run Pace (MM:SS /{profile.units === DistanceUnit.KM ? 'km' : 'mi'})</label>
                            <input
                                type="text"
                                value={(profile.fitness as IntermediateFitness).easy_run_pace || ''}
                                onChange={(e) => handleChange('fitness', { ...profile.fitness, easy_run_pace: formatTime(e.target.value, 'MM:SS') })}
                                className={inputClass}
                                placeholder="00:00"
                            />
                            {errors.easy_run_pace && <p className="text-amber-500 text-xs mt-1">{errors.easy_run_pace}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderLogisticsPage = () => (
        <div className="space-y-8">
            {/* Schedule */}
            <div className="space-y-5">
                <h3 className={sectionTitleClass}>Schedule</h3>

                <div>
                    <label className={labelClass}>First Training Date</label>
                    <input
                        type="date"
                        value={profile.first_training_date}
                        onChange={(e) => handleChange('first_training_date', e.target.value)}
                        min={getTomorrowDate()}
                        className={inputClass}
                    />
                    {errors.first_training_date && <p className="text-amber-500 text-xs mt-1">{errors.first_training_date}</p>}
                </div>

                <div>
                    <label className={labelClass}>Days Available to Train</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {Object.values(DayOfWeek).map((day) => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => toggleDayAvailable(day)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${profile.logistics.days_available.includes(day)
                                    ? 'bg-amber-500 text-neutral-900'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    {errors.days_available && <p className="text-amber-500 text-xs mt-1">{errors.days_available}</p>}
                </div>

                <div>
                    <label className={labelClass}>Preferred Long Run Day</label>
                    <select
                        value={profile.logistics.long_run_day}
                        onChange={(e) => handleChange('logistics', { ...profile.logistics, long_run_day: e.target.value as DayOfWeek })}
                        className={inputClass}
                    >
                        <option value="">Select Long Run Day</option>
                        {profile.logistics.days_available.map((day) => (
                            <option key={day} value={day}>{day}</option>
                        ))}
                    </select>
                    {errors.long_run_day && <p className="text-amber-500 text-xs mt-1">{errors.long_run_day}</p>}
                </div>
            </div>

            {/* Strength Training */}
            <div className="space-y-5">
                <h3 className={sectionTitleClass}>Strength Training</h3>

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
                        className="w-4 h-4 rounded bg-neutral-800 border-neutral-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900"
                    />
                    <label htmlFor="wants_strength_training" className="ml-2 text-sm text-neutral-300 cursor-pointer">
                        Include strength training in my plan
                    </label>
                </div>

                {wantsStrengthTraining && profile.strength && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Equipment Access</label>
                            <select
                                value={profile.strength.equipment_access}
                                onChange={(e) => handleChange('strength', { ...profile.strength, equipment_access: e.target.value as EquipmentAccess })}
                                className={inputClass}
                            >
                                <option value={EquipmentAccess.BODYWEIGHT_ONLY}>Bodyweight Only</option>
                                <option value={EquipmentAccess.DUMBBELLS_KETTLEBELLS}>Dumbbells / Kettlebells</option>
                                <option value={EquipmentAccess.FULL_GYM}>Full Gym</option>
                            </select>
                            {errors.equipment_access && <p className="text-amber-500 text-xs mt-1">{errors.equipment_access}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Sessions Per Week</label>
                            <select
                                value={profile.strength.sessions_per_week}
                                onChange={(e) => handleChange('strength', { ...profile.strength, sessions_per_week: parseInt(e.target.value) })}
                                className={inputClass}
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                            {errors.sessions_per_week && <p className="text-amber-500 text-xs mt-1">{errors.sessions_per_week}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderGoalPage = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className={labelClass}>Goal Type</label>
                    <select
                        value={profile.goal.type}
                        onChange={(e) => handleChange('goal', { ...profile.goal, type: e.target.value })}
                        className={inputClass}
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
                            <label className={labelClass}>Target</label>
                            <select
                                value={profile.goal.goal_type}
                                onChange={(e) => handleChange('goal', { ...profile.goal, goal_type: e.target.value })}
                                className={inputClass}
                            >
                                <option value="finish">Finish</option>
                                <option value="improve_speed">Improve Speed</option>
                                <option value="specific_time_target">Specific Time Target</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Race Date (optional)</label>
                            <input
                                type="date"
                                min={getMinRaceDate(profile.first_training_date)}
                                value={profile.goal.race_date || ''}
                                onChange={(e) => handleChange('goal', { ...profile.goal, race_date: e.target.value })}
                                className={inputClass}
                            />
                            {errors.race_date && <p className="text-amber-500 text-xs mt-1">{errors.race_date}</p>}
                        </div>

                        {profile.goal.goal_type === 'specific_time_target' && (
                            <div>
                                <label className={labelClass}>Target Time (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    value={profile.goal.target_time_str || ''}
                                    onChange={(e) => handleChange('goal', { ...profile.goal, target_time_str: formatTime(e.target.value, 'HH:MM:SS') })}
                                    className={inputClass}
                                    placeholder="00:00:00"
                                />
                                {errors.target_time_str && <p className="text-amber-500 text-xs mt-1">{errors.target_time_str}</p>}
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
        <div className="max-w-2xl mx-auto bg-neutral-900 rounded-xl border border-neutral-800">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-800">
                <h1 className="text-xl font-semibold text-neutral-100">Create Your Profile</h1>
                <p className="text-sm text-neutral-500 mt-1">Step {currentPageIndex + 1} of {PAGES.length}</p>
            </div>

            {/* Progress indicator */}
            <div className="px-6 py-4 border-b border-neutral-800">
                <div className="flex gap-2">
                    {PAGES.map((page, index) => (
                        <div key={page} className="flex-1">
                            <div
                                className={`h-1 rounded-full transition-colors ${index <= currentPageIndex
                                    ? 'bg-amber-500'
                                    : 'bg-neutral-800'
                                    }`}
                            />
                            <p className={`text-xs mt-2 ${index <= currentPageIndex
                                ? 'text-amber-500'
                                : 'text-neutral-600'
                                }`}>
                                {PAGE_TITLES[page]}
                            </p>
                        </div>
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
                {/* Content */}
                <div className="px-6 py-6 min-h-[320px]">
                    {renderCurrentPage()}
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 px-6 py-4 border-t border-neutral-800">
                    {errors.submit && (
                        <p className="text-amber-500 text-sm text-center">{errors.submit}</p>
                    )}
                    <div className="flex justify-between">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isFirstPage || isSubmitting}
                            className={`px-5 py-2 rounded-lg font-medium transition-all ${isFirstPage || isSubmitting
                                ? 'text-neutral-700 cursor-not-allowed'
                                : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                                }`}
                        >
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={isLastPage ? handleSubmit : handleNext}
                            disabled={isSubmitting}
                            className={`px-5 py-2 bg-amber-500 text-neutral-900 font-medium rounded-lg transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-400'}`}
                        >
                            {isSubmitting ? 'Saving...' : isLastPage ? 'Submit Profile' : 'Next'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
