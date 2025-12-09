import json
import models as m
import enums
from main import agent

def main():
    runner_profile = m.UserProfile(
        name="Alice",
        birth_date=m.UserProfile.birth_date_from_age(32),
        biological_sex="female",
        units=enums.DistanceUnit.KM,
        injury_history="Recovered mild shin splints 6 months ago",
        logistics=m.Logistics(days_available=[enums.DayOfWeek.MON, enums.DayOfWeek.WED, enums.DayOfWeek.FRI], long_run_day=enums.DayOfWeek.FRI),
        fitness=m.IntermediateFitness(
            level="intermediate",
            average_weekly_distance=35.0,
            current_longest_run=14.0,
            easy_run_pace="06:30"
        ),
        goal=m.RaceGoal(
            type="marathon",
            goal_type="finish",
            race_date="05/01/2026"
        )
    )
    if runner_profile.needs_evaluation:
        evaluation = agent.run_sync("Here is the user profile:\n" + runner_profile.to_llm_context())
        print(json.dumps(evaluation.output.model_dump()))

def tmp():
    runner_profile = m.UserProfile(
        name="Alice",
        birth_date=m.UserProfile.birth_date_from_age(32),
        biological_sex="female",
        units=enums.DistanceUnit.KM,
        injury_history="Recovered mild shin splints 6 months ago",
        days_per_week=4,
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
    print(runner_profile.to_llm_context())

if __name__ == "__main__":
    tmp()
