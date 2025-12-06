import models as m

def to_llm_context(up: m.UserProfile) -> str:
    """
    Generates a clear Markdown representation of the user profile
    optimized for LLM reasoning.
    """
    lines = []
    
    # 1. Header & Demographics
    lines.append(f"# Runner Profile: {up.name}")
    lines.append(f"- **Demographics**: {up.age} years old, {up.biological_sex}")
    lines.append(f"- **Health/Injuries**: {up.injury_history if up.injury_history else 'None reported'}")
    lines.append(f"- **Preferred Units**: {up.units.value}")
    lines.append("")

    # 2. Logistics
    lines.append("## Logistics")
    lines.append(f"- **Training Days Per Week**: {len(up.logistics.days_available)}")
    lines.append("")

    # 3. Current Fitness (Polymorphic handling)
    lines.append("## Current Fitness Level")
    if isinstance(up.fitness, m.BeginnerFitness):
        lines.append(f"- **Experience**: Beginner")
        lines.append(f"- **Daily Activity**: {up.fitness.general_activity_level.replace('_', ' ').title()}")
        lines.append(f"- **Can run 30min non-stop?**: {up.fitness.can_run_nonstop_30min.value.title()}")
    
    elif isinstance(up.fitness, m.IntermediateFitness):
        lines.append(f"- **Experience**: {up.fitness.level.title()}")
        lines.append(f"- **Avg Weekly Volume**: {up.fitness.average_weekly_distance} {up.units.value}")
        lines.append(f"- **Current Longest Run**: {up.fitness.current_longest_run} {up.units.value}")
        
        # Handle optional speed metrics only if they exist
        if up.fitness.easy_run_pace:
            lines.append(f"- **Easy Run Pace**: {up.fitness.easy_run_pace} min/{up.units.value}")
        
        if up.fitness.recent_race_time and up.fitness.recent_race_distance:
            lines.append(f"- **Recent Race**: {up.fitness.recent_race_distance}{up.units.value} in {up.fitness.recent_race_time}")
    lines.append("")

    # 4. Goal (Polymorphic handling)
    lines.append("## Primary Goal")
    if isinstance(up.goal, m.RaceGoal):
        lines.append(f"- **Event**: {up.goal.type.replace('_', ' ').title()} Race")
        lines.append(f"- **Objective**: {up.goal.goal_type.replace('_', ' ').title()}")
        
        if up.goal.race_date:
            try:
                delta = up.goal.race_date - up.first_training_date
                weeks = delta.days // 7
                remaining_days = delta.days % 7
                
                if delta.days < 0:
                    lines.append(f"- **Race Date**: {up.goal.race_date} (Passed {abs(delta.days)} days ago)")
                else:
                    lines.append(f"- **Race Date**: {up.goal.race_date}")
                    lines.append(f"- **Time to Race**: {weeks} weeks and {remaining_days} days")
            except ValueError as e:
                lines.append(f"- **Race Date**: {up.goal.race_date}")
        if up.goal.target_time_str:
            lines.append(f"- **Target Time**: {up.goal.target_time_str}")
    
    elif isinstance(up.goal, m.GeneralGoal):
        lines.append(f"- **Objective**: {up.goal.type.replace('_', ' ').title()}")

    return "\n".join(lines)

def get_plan_parameters(up: m.UserProfile):
    if up.has_race_date:
        goal_context = f"Targeting race on {up.goal.race_date}."
    else:
        goal_context = "General fitness improvement. No specific race date."

    if up.first_week_sessions == len(up.logistics.days_available):
        first_week_context = "FULL_WEEK: Standard training week."
    else:
        first_week_context = f"PARTIAL_WEEK: Only {up.first_week_sessions} session(s) available. Adjust volume accordingly"

    return {
        "duration_weeks": up.duration_weeks,
        "goal_context": goal_context,
        "first_week_context": first_week_context
    }
