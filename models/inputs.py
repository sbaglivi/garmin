from models import enums, validators
from datetime import timedelta, date
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator

datefmt = r"%d/%m/%Y"

class BeginnerFitness(BaseModel):
    level: Literal["beginner"]
    general_activity_level: Literal["sedentary", "lightly_active", "moderately_active", "very_active"] = Field(
        description="Used if no running history."
    )
    can_run_nonstop_30min: enums.ConfirmationStatus = Field(description="Can the user currently run for 30 minutes without stopping?")

class RecentRace(BaseModel):
    time: Optional[str] = Field(default=None, description="HH:MM:SS")
    distance: Optional[Literal["5k", "10k", "half_marathon", "marathon"]] = None

class IntermediateFitness(BaseModel):
    level: Literal["intermediate", "advanced"]
    average_weekly_distance: float
    current_longest_run: float
    recent_race: Optional[RecentRace] = None
    # Speed baseline
    easy_run_pace: Optional[str] = Field(default=None, description="MM:SS /unit")

class Logistics(BaseModel):
    days_available: list[enums.DayOfWeek]
    long_run_day: enums.DayOfWeek

class RaceGoal(BaseModel):
    type: Literal["5k", "10k", "half_marathon", "marathon"]
    goal_type: Literal["finish", "improve_speed", "specific_time_target"]
    # race_date: Optional[date] = Field(default=None, description="date in dd/mm/yyyy format")
    race_date: Optional[validators.DateField] = Field(default=None, description="date in dd/mm/yyyy format")
    target_time_str: Optional[str] = Field(default=None, description="time in HH:MM:SS")

class GeneralGoal(BaseModel):
    type: Literal["fitness_maintenance", "base_building"]

class StrengthProfile(BaseModel):
    equipment_access: Literal["bodyweight_only", "dumbbells_kettlebells", "full_gym"]
    sessions_per_week: int = Field(..., ge=1, le=3)


class UserProfileInput(BaseModel):
    """Input model for API - frontend sends age, API converts to birth_date."""
    name: str
    age: int = Field(..., gt=0, description="User's age in years")
    biological_sex: Literal["male", "female", "prefer_not_to_say"]
    units: enums.DistanceUnit = enums.DistanceUnit.KM
    injury_history: Optional[str] = None
    fitness: BeginnerFitness | IntermediateFitness
    logistics: Logistics
    strength: Optional[StrengthProfile] = None
    goal: RaceGoal | GeneralGoal
    first_training_date: validators.DateField

    def to_user_profile(self) -> "UserProfile":
        """Convert input to UserProfile by computing birth_date from age."""
        return UserProfile(
            name=self.name,
            birth_date=UserProfile.birth_date_from_age(self.age),
            biological_sex=self.biological_sex,
            units=self.units,
            injury_history=self.injury_history,
            fitness=self.fitness,
            logistics=self.logistics,
            strength=self.strength,
            goal=self.goal,
            first_training_date=self.first_training_date,
        )


class UserProfile(BaseModel):
    name: str
    birth_date: validators.DateField = Field(
        description="Approximate birth date. Computed from age at profile creation (assumes July 1st birthday)."
    )
    biological_sex: Literal["male", "female", "prefer_not_to_say"]
    units: enums.DistanceUnit = enums.DistanceUnit.KM
    injury_history: Optional[str] = None
    fitness: BeginnerFitness | IntermediateFitness
    logistics: Logistics
    strength: Optional[StrengthProfile] = None
    goal: RaceGoal | GeneralGoal
    first_training_date: validators.DateField

    @staticmethod
    def birth_date_from_age(age: int, reference_date: Optional[date] = None) -> date:
        """
        Convert age to an approximate birth date. Uses July 1st as the assumed birthday
        (middle of the year) to minimize error.
        """
        if reference_date is None:
            reference_date = date.today()
        return date(reference_date.year - age, 7, 1)

    @property
    def age(self) -> int:
        """Calculate current age from birth_date."""
        today = date.today()
        age = today.year - self.birth_date.year
        # Adjust if birthday hasn't occurred yet this year
        if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
            age -= 1
        return age

    @model_validator(mode='after')
    def validate_timeline(self):
        if not isinstance(self.goal, RaceGoal) or not self.goal.race_date:
            return self

        start = self.first_training_date
        race = self.goal.race_date
        if race <= start:
            raise ValueError("Race date must be strictly after the first training date.")

        return self

    @property
    def needs_evaluation(self) -> bool:
        if self.age >= 60 and isinstance(self.goal, RaceGoal):
            return True

        if isinstance(self.goal, GeneralGoal):
            return False

        return self.goal.race_date or self.goal.target_time_str

    @property
    def has_race_date(self) -> bool:
        return isinstance(self.goal, RaceGoal) and self.goal.race_date is not None

    @property
    def plan_start_date(self) -> date:
        """
        The Monday of the week containing first_training_date.
        This is day 1 of the training plan for calendar/week tracking purposes.
        """
        # weekday() returns 0 for Monday, 6 for Sunday
        days_since_monday = self.first_training_date.weekday()
        return self.first_training_date - timedelta(days=days_since_monday)

    @property
    def duration_weeks(self) -> int:
        if not self.has_race_date:
            return 12

        race_date = self.goal.race_date
        # Count full weeks from plan_start_date to race_date
        full_weeks = (race_date - self.plan_start_date).days // 7 + 1
        return full_weeks

    def current_week_number(self, reference_date: Optional[date] = None) -> int:
        """
        Calculate which week of the plan we're in (1-indexed).
        Returns 0 if plan hasn't started yet.
        """
        if reference_date is None:
            reference_date = date.today()
        if reference_date < self.plan_start_date:
            return 0
        days_elapsed = (reference_date - self.plan_start_date).days
        return (days_elapsed // 7) + 1

    @property
    def first_week_sessions(self) -> int:
        """
        Calculates how many training opportunities remain in the current ISO week (Mon-Sun)
        starting from (and including) the start_date.
        """
        day_map = {
            enums.DayOfWeek.MON: 0, enums.DayOfWeek.TUE: 1, enums.DayOfWeek.WED: 2, 
            enums.DayOfWeek.THU: 3, enums.DayOfWeek.FRI: 4, enums.DayOfWeek.SAT: 5, 
            enums.DayOfWeek.SUN: 6
        }
        user_days_indices = {day_map[d] for d in self.logistics.days_available}
        current_weekday_idx = self.first_training_date.weekday()
        remaining_sessions = 0
        
        for day_idx in range(current_weekday_idx, 7):
            if day_idx in user_days_indices:
                remaining_sessions += 1
        return remaining_sessions