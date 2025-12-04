import enums
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class BeginnerFitness(BaseModel):
    level: Literal["beginner"]
    general_activity_level: Literal["sedentary", "lightly_active", "moderately_active", "very_active"] | None = Field(
        None, 
        description="Used if no running history. Sedentary=Desk job, no sports. Active=Manual labor or plays other sports."
    )
    can_run_nonstop_30min: enums.ConfirmationStatus = Field(description="Can the user currently run for 30 minutes without stopping?")

# Grouping Current Fitness allows the model to reason about baseline
class IntermediateFitness(BaseModel):
    # Experience helps decide the complexity of workouts (simple runs vs intervals)
    level: Literal["intermediate", "advanced"] 
    
    # Quantitative baseline
    average_weekly_distance: float = Field(description="Average volume over last 4 weeks")
    current_longest_run: float = Field(description="Distance of the longest single run in the last 4 weeks")
    
    # Speed baseline (One of these is required for pacing)
    recent_race_time: Optional[str] = Field(description="HH:MM:SS for a standard distance")
    recent_race_distance: Optional[float]
    easy_run_pace: Optional[str] = Field(description="Average pace for a comfortable run (MM:SS /unit)")

class Logistics(BaseModel):
    days_available: List[enums.DayOfWeek] = Field(description="Days user can generally train")
    long_run_day: enums.DayOfWeek = Field(description="Preferred day for the longest session")

class RaceGoal(BaseModel):
    type: Literal["5k", "10k", "half_marathon", "marathon"]
    # Using a specific date model or simple Date object is fine
    goal_type: Literal["finish", "improve_speed", "specific_time_target"]
    race_date: Optional[str] = Field(default=None, description="YYYY-MM-DD") 
    target_time_str: Optional[str] = Field(default=None, description="HH:MM:SS target")

class GeneralGoal(BaseModel):
    type: Literal["fitness_maintenance", "base_building"]

class UserProfile(BaseModel):
    name: str
    age: int
    # Biological sex is useful for heart rate/pace calculation standards
    biological_sex: Literal["male", "female", "prefer_not_to_say"]
    
    units: enums.DistanceUnit = enums.DistanceUnit.KM
    
    # Health checks
    injury_history: Optional[str] = Field(description="Brief description of past issues (knees, shins, etc)")

    fitness: BeginnerFitness | IntermediateFitness
    logistics: Logistics
    goal: RaceGoal | GeneralGoal