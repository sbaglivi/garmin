from models import enums, validators
from datetime import timedelta
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator

datefmt = r"%d/%m/%Y"

class BeginnerFitness(BaseModel):
    level: Literal["beginner"]
    general_activity_level: Literal["sedentary", "lightly_active", "moderately_active", "very_active"] = Field(
        description="Used if no running history."
    )
    can_run_nonstop_30min: enums.ConfirmationStatus = Field(description="Can the user currently run for 30 minutes without stopping?")

class IntermediateFitness(BaseModel):
    level: Literal["intermediate", "advanced"] 
    average_weekly_distance: float
    current_longest_run: float
    # Speed baseline
    recent_race_time: Optional[str] = Field(default=None, description="HH:MM:SS")
    recent_race_distance: Optional[float] = None
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

class UserProfile(BaseModel):
    name: str
    age: int
    biological_sex: Literal["male", "female", "prefer_not_to_say"]
    units: enums.DistanceUnit = enums.DistanceUnit.KM
    injury_history: Optional[str] = None
    fitness: BeginnerFitness | IntermediateFitness
    logistics: Logistics
    strength: Optional[StrengthProfile]
    goal: RaceGoal | GeneralGoal
    first_training_date: validators.DateField

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
    def duration_weeks(self) -> int:
        if not self.has_race_date:
            return 12

        days_until_next_monday = 7 - self.first_training_date.weekday()
        next_monday = self.first_training_date + timedelta(days=days_until_next_monday)

        race_date = self.goal.race_date
        full_weeks = (race_date - next_monday).days // 7 + 1
        return full_weeks

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