import dotenv
dotenv.load_dotenv()

# from pydantic_ai.models.openai import OpenAIChatModel
# model = OpenAIChatModel("gpt-4o-mini") # can add settings like temperature and max tokens here

from pydantic_ai.models.google import GoogleModel
model = GoogleModel("gemini-2.5-flash")

import models as m

test_profile = m.UserProfile(
    name="Alice",
    age=32,
    biological_sex="female",
    strength=m.StrengthProfile(equipment_access="bodyweight_only", sessions_per_week=1),
    units=m.DistanceUnit.KM,
    injury_history="Recovered mild shin splints 6 months ago",
    logistics=m.Logistics(days_available=[m.DayOfWeek.MON, m.DayOfWeek.WED, m.DayOfWeek.FRI], long_run_day=m.DayOfWeek.FRI),
    first_training_date="09/12/2025",
    fitness=m.IntermediateFitness(
        level="intermediate",
        average_weekly_distance=35.0,
        current_longest_run=14.0,
        easy_run_pace="06:30"
    ),
    goal=m.RaceGoal(
        type="marathon",
        goal_type="finish",
        race_date="05/05/2026"
    )
)
