from models import enums, inputs
from typing import Optional, Literal
from pydantic import BaseModel, Field

class Proposal(BaseModel):
    description: str = Field(..., description="Short text for the button, e.g., 'Delay Race to June'")
    reason: str = Field(..., description="Why this change fixes the problem")
    new_goal: Optional[inputs.RaceGoal | inputs.GeneralGoal] = None
    new_days_per_week: int | None = None

class ProfileEvaluation(BaseModel):
    message: str = Field(..., description="why you came to this conclusion")
    outcome: enums.RiskValuation = Field(..., description="whether the user current fitness is compatible with the goals set")
    proposals: list[Proposal] = Field(..., description="if outcome is not ok, suggest possible changes that the user could make. E.g. Train 3 times a week instead of 2, target a HM instead of a marathon, spend 6 months preparing instead of 3")

class RunningSession(BaseModel):
    day: enums.DayOfWeek
    run_type: Literal["easy", "recovery", "long_run", "tempo", "interval", "fartlek", "race_simulation"]
    distance_km: float
    workout_description: str
    notes: Optional[str] = None

class Exercise(BaseModel):
    name: str
    series: int
    reps: Optional[int] = None
    hold: Optional[int] = Field(default=None, description="if isometric, how long to hold the position for in seconds")
    weight: Optional[int] = None
    recovery: int = Field(..., description="time in seconds between sets")
    form_cues: str = Field(..., description="how to perform the exercise and what to pay attention to")

class StrengthSession(BaseModel):
    day: enums.DayOfWeek
    duration_minutes: int
    exercises: list[Exercise]

class WeeklySchedule(BaseModel):
    week_number: int
    phase_name: str
    # These act as a "CoT" check for the LLM to verify its own math
    weekly_volume_target: float 
    weekly_long_run_target: float
    week_overview: str
    
    running_sessions: list[RunningSession]
    strength_sessions: list[StrengthSession] # Empty list if no strength profile