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

export interface IntermediateFitness {
    level: "intermediate" | "advanced";
    average_weekly_distance: number;
    current_longest_run: number;
    recent_race_time?: string;
    recent_race_distance?: number;
    easy_run_pace?: string;
}

export interface Logistics {
    days_available: DayOfWeek[];
    long_run_day: DayOfWeek;
}

export interface Goal {
    type: "5k" | "10k" | "half_marathon" | "marathon" | "fitness_maintenance" | "base_building";
    race_date?: string;
    goal_type: "finish" | "improve_speed" | "specific_time_target";
    target_time_str?: string;
}

export interface UserProfile {
    name: string;
    age: number;
    biological_sex: "male" | "female" | "prefer_not_to_say";
    units: DistanceUnit;
    injury_history?: string;
    fitness: BeginnerFitness | IntermediateFitness;
    logistics: Logistics;
    goal: Goal;
}
