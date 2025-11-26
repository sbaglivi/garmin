from pydantic import BaseModel, Field
from typing import Literal, Annotated
from datetime import datetime
from langgraph.graph.message import add_messages, AnyMessage

def iter_populated_fields(model: BaseModel):
    for name, value in model.model_dump(exclude_none=True).items():
        yield name, value

type Weekday = Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

class RaceDate(BaseModel):
    absolute: datetime | None = Field(
        default=None,
        description="Absolute date in ISO 8601 format, only if the user provided an explicit date (e.g. '2023-10-12', 'October 2023', 'on May 5th')."
    )
    relative: str | None = Field(
        default=None,
        description="The raw relative expression from the user (e.g. 'about a month ago', 'last summer'). Do NOT convert it; copy it as given, with minimal normalization."
    )

class Goal(BaseModel):
    type: Literal["5k", "10k", "half_marathon", "marathon", "fitness", "lose weight"]
    target_date: RaceDate | None = Field(
        default=None,
        description="Date by which user would like to accomplish the goal. If the user gave an absolute date, fill 'absolute'. If they gave a relative date, fill 'relative'."
    )
    target_time: float | None = None # minutes

class RunTime(BaseModel):
    day: Weekday
    time_of_day: Literal["morning", "afternoon", "evening"]

class BaseUserProfile(BaseModel):
    preferred_distance_unit: Literal["miles", "kilometers"] | None
    goal: Goal | None
    age: int | None
    injury_history: list[str] | None
    days_per_week: int | None
    preferred_run_times: list[RunTime] | None

class BeginnerUserProfile(BaseUserProfile):
    activity_level: str | None

class Race(BaseModel):
    distance: Literal["5k", "10k", "half_marathon", "marathon"]
    finish_time: float # minutes
    date: RaceDate | None = Field(
        default=None,
        description="Date of the race. If the user gave an absolute date, fill 'absolute'. If they gave a relative date, fill 'relative'."
    )

class AdvancedUserProfile(BaseUserProfile):
    distance_per_week: float | None
    recent_races: list[Race] | None

class AgentState(BaseModel):
    preferred_distance_unit: Literal["miles", "kilometers"] | None = None
    goal: Goal | None = None
    age: int | None = None
    injury_history: list[str] | None = None
    days_per_week: int | None = None

    # beginner
    activity_level: str | None = None
    # intermediate
    distance_per_week: float | None = None
    recent_races: list[Race] | None = None

    # state
    messages: Annotated[list[AnyMessage], add_messages]
    user_level: Literal["beginner", "advanced", "unknown"] = "unknown"


class WeeklyPreferences(BaseModel):
    run_times: list[RunTime]

class TriageResult(BaseModel):
    # The "Chain of Thought" - helps the LLM make the right decision
    reasoning: str = Field(..., description="Explain why you think the user is a beginner or advanced based on their message.")
    
    # The Decision - Pydantic will REJECT any string that isn't one of these 3
    user_level: Literal["beginner", "advanced", "unknown"] = Field(..., description="The classification of the user.")
