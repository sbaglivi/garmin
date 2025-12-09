export const DistanceUnit = {
    KM: "kilometers",
    MILES: "miles",
} as const;
export type DistanceUnit = typeof DistanceUnit[keyof typeof DistanceUnit];

export const DayOfWeek = {
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday",
    SUN: "Sunday",
} as const;
export type DayOfWeek = typeof DayOfWeek[keyof typeof DayOfWeek];

export const ConfirmationStatus = {
    YES: "yes",
    NO: "no",
    MAYBE: "maybe",
} as const;
export type ConfirmationStatus = typeof ConfirmationStatus[keyof typeof ConfirmationStatus];

export interface BeginnerFitness {
    level: "beginner";
    general_activity_level?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | null;
    can_run_nonstop_30min?: ConfirmationStatus | null;
}

export const RaceDistance = {
    FIVE_K: "5k",
    TEN_K: "10k",
    HALF_MARATHON: "half_marathon",
    MARATHON: "marathon",
} as const;
export type RaceDistance = typeof RaceDistance[keyof typeof RaceDistance];

export interface RecentRace {
    time: string;
    distance: RaceDistance;
}

export interface IntermediateFitness {
    level: "intermediate" | "advanced";
    average_weekly_distance: number;
    current_longest_run: number;
    recent_race?: RecentRace;
    easy_run_pace?: string;
}

export interface Logistics {
    days_available: DayOfWeek[];
    long_run_day: DayOfWeek;
}

export const EquipmentAccess = {
    BODYWEIGHT_ONLY: "bodyweight_only",
    DUMBBELLS_KETTLEBELLS: "dumbbells_kettlebells",
    FULL_GYM: "full_gym",
} as const;
export type EquipmentAccess = typeof EquipmentAccess[keyof typeof EquipmentAccess];

export interface StrengthProfile {
    equipment_access: EquipmentAccess;
    sessions_per_week: number;
}

export interface Goal {
    type: "5k" | "10k" | "half_marathon" | "marathon" | "fitness_maintenance" | "base_building";
    race_date?: string;
    goal_type: "finish" | "improve_speed" | "specific_time_target";
    target_time_str?: string;
}

// What the frontend form sends to the API
export interface UserProfileInput {
    name: string;
    age: number; // API converts this to birth_date
    biological_sex: "male" | "female" | "prefer_not_to_say";
    units: DistanceUnit;
    injury_history?: string;
    fitness: BeginnerFitness | IntermediateFitness;
    logistics: Logistics;
    strength?: StrengthProfile;
    goal: Goal;
    first_training_date: string; // ISO date string YYYY-MM-DD
}

// What the API stores and returns
export interface UserProfile {
    name: string;
    birth_date: string; // ISO date string YYYY-MM-DD, computed from age at profile creation
    biological_sex: "male" | "female" | "prefer_not_to_say";
    units: DistanceUnit;
    injury_history?: string;
    fitness: BeginnerFitness | IntermediateFitness;
    logistics: Logistics;
    strength?: StrengthProfile;
    goal: Goal;
    first_training_date: string; // ISO date string YYYY-MM-DD
}

// Training Strategy types
export interface PhaseStrategy {
    phase_name: "Base" | "Build" | "Peak" | "Taper";
    duration_weeks: number;
    key_focus: string;
}

export interface TrainingStrategy {
    plan_overview: string;
    target_peak_volume_km: number;
    target_longest_run_km: number;
    phases: PhaseStrategy[];
}

// Verification types
export interface Proposal {
    description: string;
    reason: string;
    new_goal?: Goal;
    new_days_per_week?: number;
}

export interface VerificationResult {
    outcome: "ok" | "warning" | "rejected";
    message: string;
    proposals: Proposal[];
}

// Weekly Schedule types
export type RunType = "easy" | "recovery" | "long_run" | "tempo" | "interval" | "fartlek" | "race_simulation";

export interface RunningSession {
    day: DayOfWeek;
    run_type: RunType;
    distance_km: number;
    workout_description: string;
    notes?: string;
}

export interface Exercise {
    name: string;
    series: number;
    reps?: number;
    hold?: number;
    weight?: number;
    recovery: number;
    form_cues: string;
}

export interface StrengthSession {
    day: DayOfWeek;
    duration_minutes: number;
    exercises: Exercise[];
}

export interface WeeklySchedule {
    week_number: number;
    phase_name: string;
    weekly_volume_target: number;
    weekly_long_run_target: number;
    week_overview: string;
    running_sessions: RunningSession[];
    strength_sessions: StrengthSession[];
}

// User state from API
export interface UserState {
    has_profile: boolean;
    profile?: UserProfile;
    plan_start_date?: string; // ISO date YYYY-MM-DD, Monday of the week containing first_training_date
    verification_status?: "pending" | "completed" | "error" | null;
    verification_result?: VerificationResult;
    macroplan_status?: "pending" | "completed" | "error" | null;
    training_overview?: TrainingStrategy;
    weekly_plan_status?: "pending" | "completed" | "error" | null;
    weekly_schedules?: WeeklySchedule[];
}

// Calendar and session feedback types
export interface SessionFeedback {
    id: string;
    sessionDate: string; // ISO date YYYY-MM-DD
    avgHeartRate?: number;
    maxHeartRate?: number;
    perceivedExertion?: number; // 1-10 scale
    notes?: string;
    completedAsPlanned: boolean;
}

export interface UnplannedSession {
    id: string;
    date: string; // ISO date YYYY-MM-DD
    distance_km: number;
    duration_minutes?: number;
    avgPace?: string; // MM:SS per km
    intervals?: IntervalSet[];
    notes?: string;
    run_type?: RunType;
}

export interface IntervalSet {
    reps: number;
    distance_meters: number;
    targetPace?: string; // MM:SS per km
    recoverySeconds?: number;
}

export interface CalendarSession {
    type: 'planned' | 'unplanned';
    date: string;
    runningSession?: RunningSession;
    strengthSession?: StrengthSession;
    unplannedSession?: UnplannedSession;
    feedback?: SessionFeedback;
}

// Helper to calculate age from birth_date
export function calculateAgeFromBirthDate(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// Convert stored UserProfile to form input format
export function profileToInput(profile: UserProfile): UserProfileInput {
    return {
        ...profile,
        age: calculateAgeFromBirthDate(profile.birth_date),
    };
}
