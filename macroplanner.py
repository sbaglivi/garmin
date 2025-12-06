import models as m
import model_utils as mu
import shared
from pydantic import BaseModel, Field
from pydantic_ai import Agent
import textwrap
from typing import Literal

class PhaseStrategy(BaseModel):
    phase_name: Literal["Base", "Build", "Peak", "Taper"]
    duration_weeks: int
    key_focus: str

class TrainingStrategy(BaseModel):
    plan_overview: str
    target_peak_volume_km: int = Field(..., description="The maximum weekly volume needed for this specific race goal.")
    target_longest_run_km: int = Field(..., description="The distance of the longest single run in the plan.")
    phases: list[PhaseStrategy]

prompt = textwrap.dedent("""
You are an expert running coach specializing in periodized training plans for runners of all levels, from absolute beginners to advanced athletes.

Your task is to generate a high-level `TrainingStrategy` based on a user's profile and the time available before their target event.

### Rules for Generating the Strategy:

1. **Volume & Long Run Targets**:
   - Determine `target_peak_volume_km` and `target_longest_run_km` based on the Race Goal (distance) and User Fitness Level.
   - *Marathon*: Long run 30-32km (Beginner) to 35km+ (Advanced). Peak volume 50km+ (Beginner) to 80km+ (Advanced).
   - *Half Marathon*: Long run 16km (Beginner) to 22km (Advanced).
   - *5k/10k*: Long run should exceed race distance slightly (e.g., 7-8km for 5k, 12-14km for 10k).
   - *General Fitness*: Cap volume at sustainable levels based on history.

2. **Phase Periodization Logic**:
   - You must divide the `total_weeks_available` into 4 phases: "Base", "Build", "Peak", "Taper".
   - **The sum of `duration_weeks` across all phases MUST equal exactly the `total_weeks_available` provided in the context.**
   - **Taper**: Usually 1-3 weeks depending on race distance (3 for Marathon, 1 for 5k).
   - **Peak**: High intensity/volume period (usually 2-4 weeks).
   - **Build**: Increasing specificity and volume.
   - **Base**: Aerobic development. If time is short, shorten the Base phase first.
   - If the goal is `fitness_maintenance` or `base_building`, use primarily the "Base" phase, perhaps with a small "Build" block, and set Taper to 0 if no specific date is set.

3. **Safety & Logistics**:
   - Ensure the progression is realistic given the `injury_history` (be more conservative with volume if injuries exist).
   - Respect `days_available`. Do not prescribe high volume if the user only runs 2 days a week.

4. **Plan Overview**:
   - Write a short, motivating summary explaining the strategy (e.g., "We will focus on building your aerobic base for 6 weeks before sharpening your speed for the 5k.").

Analyze the user's data and the time constraints carefully before outputting the strategy.
""".strip())

agent = Agent(
    model=shared.model,
    output_type=TrainingStrategy,
    instructions=prompt
)

def main():
    params = mu.get_plan_parameters(shared.test_profile)
    params["user_profile_json"] = shared.test_profile.model_dump_json()

    user_prompt = textwrap.dedent("""
Please generate the Training Strategy for this user:

### Context Variables
- **Total Weeks Available**: {duration_weeks}
- **First Week**: {first_week_context}

### User Profile
{user_profile_json}
    """.strip().format(**params))
    # print(params)
    # print(user_prompt)
    # response = agent.run_sync(user_prompt)
    # with open("./plan.json", "w") as f:
    #     f.write(response.output.model_dump_json(indent=2))
    # print(calculate_plan_parameters(date(2025, 12, 4), date(2025, 12,21)))

main()