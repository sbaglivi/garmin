import models as m
from macroplanner import TrainingStrategy
from pydantic import BaseModel
from pydantic_ai import Agent
import shared
import json
from pathlib import Path

# --- Output Model ---
class WeeklyTarget(BaseModel):
    week_number: int
    phase_name: str
    is_recovery_week: bool
    total_volume_km: int
    long_run_km: int

# --- Helper Logic ---

def determine_recovery_cycle(profile: m.UserProfile) -> int:
    """
    Returns the cycle length (e.g., 3 for a 2:1 cycle, 4 for a 3:1 cycle).
    logic:
    - Default is 3 weeks build + 1 week recovery (cycle = 4).
    - If Age > 50, Injury History exists, or Beginner -> 2 weeks build + 1 recovery (cycle = 3).
    """
    risk_factors = 0
    
    if profile.age > 50:
        risk_factors += 1
    if profile.injury_history:
        risk_factors += 1
    if isinstance(profile.fitness, m.BeginnerFitness):
        risk_factors += 1
        
    # If any significant risk factor exists, use a shorter cycle (2:1)
    if risk_factors > 0:
        return 3 # 2 weeks build, 1 week recovery
    return 4 # 3 weeks build, 1 week recovery

def get_starting_values(profile: m.UserProfile):
    """
    Estimates current safe volume and long run based on profile.
    """
    if isinstance(profile.fitness, m.IntermediateFitness):
        start_vol = profile.fitness.average_weekly_distance
        start_lr = profile.fitness.current_longest_run
    else:
        # Beginner logic
        if profile.fitness.can_run_nonstop_30min == "yes": # Assuming yes/no enum
            start_vol = 15
            start_lr = 5
        else:
            start_vol = 10
            start_lr = 3
            
    return start_vol, start_lr

def calculate_weekly_progression(
    user_profile: m.UserProfile, 
    strategy: TrainingStrategy
) -> list[WeeklyTarget]:
    
    # 1. Setup Baselines
    cycle_length = determine_recovery_cycle(user_profile)
    current_vol, current_lr = get_starting_values(user_profile)
    
    # 2. Expand Phases into a linear week map
    # We need to know which week belongs to which phase
    weeks_map = []
    week_counter = 1
    for phase in strategy.phases:
        for _ in range(phase.duration_weeks):
            weeks_map.append({
                "week_num": week_counter,
                "phase": phase.phase_name
            })
            week_counter += 1
            
    total_weeks = len(weeks_map)
    
    # Identify index of the Peak week (Usually the last week of the 'Peak' phase)
    # If Taper exists, the Peak is the week before Taper starts.
    peak_week_index = total_weeks - 1
    for i, w in enumerate(weeks_map):
        if w["phase"] == "Taper":
            peak_week_index = i - 1
            break
            
    # If no specific peak/taper structure (e.g. general fitness), peak is end
    if peak_week_index < 0: peak_week_index = total_weeks - 1

    # 3. Calculate Progression (Linear Interpolation with Recovery Dips)
    weekly_targets = []
    
    # Calculate the raw amount to add per week to reach target by peak week
    # (Target - Start) / Number of build weeks
    # This is a simplification; we will refine it by iterating.
    
    vol_range = strategy.target_peak_volume_km - current_vol
    lr_range = strategy.target_longest_run_km - current_lr
    
    # Avoid negative progression if user is already above target (rare but possible)
    vol_range = max(0, vol_range)
    lr_range = max(0, lr_range)

    for i, w_data in enumerate(weeks_map):
        phase = w_data["phase"]
        week_num = w_data["week_num"]
        
        # --- TAPER LOGIC ---
        if phase == "Taper":
            # Taper is specific: huge drops regardless of cycles
            # Week 1 of taper: ~70-75% of peak
            # Week 2 of taper: ~40-50% of peak (Race week)
            # We calculate distance from end of plan
            weeks_until_race = total_weeks - i
            
            if weeks_until_race >= 3:
                factor = 0.75
            elif weeks_until_race == 2:
                factor = 0.60
            else: # Race week
                factor = 0.40 # Includes the race itself usually
                
            vol = round(strategy.target_peak_volume_km * factor)
            lr = round(strategy.target_longest_run_km * factor * 0.6) # LR drops faster in taper
            
            weekly_targets.append(WeeklyTarget(
                week_number=week_num,
                phase_name=phase,
                is_recovery_week=True, # Taper is all recovery
                total_volume_km=vol,
                long_run_km=lr
            ))
            continue

        # --- BUILD/BASE/PEAK LOGIC ---
        
        # Determine if this is a recovery week in the cycle
        # e.g., in a 3:1 cycle (length 4), weeks 4, 8, 12 are recovery
        # Logic: If it's the last week of a cycle, OR if it's the very first week (ramp up)
        is_recovery = (week_num % cycle_length == 0) and (i != peak_week_index)
        
        # Linear progress calculation
        # Fraction of progress from 0.0 to 1.0 based on current index vs peak index
        if peak_week_index > 0:
            progress_fraction = i / peak_week_index
        else:
            progress_fraction = 1.0
            
        # Calculate "Ideal Linear" value for this week
        raw_vol = current_vol + (vol_range * progress_fraction)
        raw_lr = current_lr + (lr_range * progress_fraction)
        
        if is_recovery:
            # Drop back 20-25% from the *calculated current level*
            vol = round(raw_vol * 0.8)
            lr = round(raw_lr * 0.75)
        elif i == peak_week_index:
            # Force exact targets on peak week
            vol = strategy.target_peak_volume_km
            lr = strategy.target_longest_run_km
        else:
            # Standard build week
            vol = round(raw_vol)
            lr = round(raw_lr)

        # Safety Cap: Long run should usually not exceed 50% of total volume 
        # (Exception: beginner low volume plans where LR is the main workout)
        if vol > 30 and lr > (vol * 0.55):
             lr = round(vol * 0.55)

        weekly_targets.append(WeeklyTarget(
            week_number=week_num,
            phase_name=phase,
            is_recovery_week=is_recovery,
            total_volume_km=vol,
            long_run_km=lr
        ))
        
    return weekly_targets


system_prompt="""
You are an expert running coach. Your task is to detail the specific daily sessions for ONE WEEK of a training plan based on the provided context.

### 1. Running Session Rules
- **Days Available**: You must ONLY schedule runs on the days specified in `running_days_available`.
- **Long Run**: You MUST place the `long_run` on the specific `long_run_day`.
- **Volume Accuracy**: The sum of `distance_km` across all running sessions must equal the `weekly_volume_target` (+/- 5% tolerance).
- **Long Run Accuracy**: The `long_run` session distance must exactly match `weekly_long_run_target`.
- **Phase Logic**:
   - *Base*: Mostly easy runs.
   - *Build*: Include 1-2 quality sessions (Intervals/Tempo) depending on fitness.
   - *Peak*: Highest intensity.
   - *Taper*: Reduce volume significantly, keep intensity but short duration.
   - *Recovery*: No hard workouts, only easy runs.

### 2. Strength Session Rules
- **Condition**: Only schedule strength sessions if `strength_profile` is provided in the user message.
- **Frequency**: If provided, schedule exactly the number of sessions specified in `sessions_per_week`.
- **Equipment**: Tailor exercises strictly to the `equipment_access` level.
- **Placement**:
   - Ideally on the same day as a shorter/easy run, or on a non-running day.
   - Avoid heavy leg strength work the day immediately before the Long Run.

### 3. Output Format
Return a valid JSON object matching the `WeeklySchedule` schema. 
- Separate `running_sessions` and `strength_sessions`.
- Ensure descriptions are human-readable and motivating.
"""

agent = Agent(model=shared.model, instructions=system_prompt, output_type=m.WeeklySchedule)

def build_weekly_planner_prompt(
    user_profile: m.UserProfile, 
    weekly_target: WeeklyTarget
) -> str:
    
    # 1. Format Strength Info
    strength_info = "Not requested."
    if user_profile.strength:
        strength_info = f"""
        - Status: Active
        - Target Sessions: {user_profile.strength.sessions_per_week}
        - Equipment: {user_profile.strength.equipment_access}
        """

    # 2. Format Running Schedule
    available_days = [d.value for d in user_profile.logistics.days_available]
    lr_day = user_profile.logistics.long_run_day.value

    # 3. Construct Message
    return f"""
Please generate the schedule for this specific week:

### Weekly Goals
- **Week Number**: {weekly_target.week_number}
- **Phase**: {weekly_target.phase_name}
- **Target Total Volume**: {weekly_target.total_volume_km} km
- **Target Long Run**: {weekly_target.long_run_km} km

### User Constraints
- **Fitness Level**: {user_profile.fitness.level}
- **Running Days**: {", ".join(available_days)}
- **Long Run Day**: {lr_day}

### Strength Training Context
{strength_info}
    """

def main():
    with open("plan.json") as f:
        train_raw = json.load(f)
    train = TrainingStrategy.model_validate(train_raw)
    res = calculate_weekly_progression(shared.test_profile, train)
    for i,w in enumerate(res[:6]):
        p = Path(f"weeks/{i}.json")
        if p.is_file():
            continue

        response = agent.run_sync(build_weekly_planner_prompt(shared.test_profile, w))
        with p.open("w") as f:
            f.write(response.output.model_dump_json(indent=2))


main()