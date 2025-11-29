import models
import textwrap
from typing import Any
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage

load_dotenv()

gpt = ChatOpenAI(model_name="gpt-4o-mini", use_responses_api=True)

def yes_or_no():
    while True:
        user_input = input("Your response: ").lower().strip()
        if user_input == "yes":
            return True
        elif user_input == "no":
            return False
        
        print("Sorry, I couldn't quite catch that. Can you answer with a 'yes' or 'no'?")

def race_results_complete(state: models.State) -> bool:
    if not state.recent_race:
        return False
    if state.recent_race.distance is None or state.recent_race.finish_time is None:
        return False
    return True

def get_profile_status(state: models.State) -> tuple[dict[str, Any], list[str]]:
    """
    Returns a dict with 'known_info' and 'missing_fields' 
    based on the user_level.
    """
    user_level = state.user_level

    # 1. Define the Required Fields based on level
    required_keys = ["goal", "days_per_week", "preferred_distance_unit", "age", "injury_history"]
    if user_level == "beginner":
        required_keys += ["activity_level"]
    elif user_level == "advanced":
        required_keys += ["distance_per_week"]

    # 2. Calculate Missing vs Known
    missing = []
    known = {}
    
    for key in required_keys:
        value = getattr(state, key, None)
        if value is None:
            missing.append(key)
        else:
            known[key] = value
    
    if user_level == "advanced" and not race_results_complete(state):
        missing.append("recent_race")
            
    return known, missing

def with_system_prompt(messages: list[models.AnyMessage], system_prompt: str) -> list[dict]:
    return [SystemMessage(content=system_prompt)] + messages

def prompt(text: str) -> str:
    return textwrap.dedent(text).strip()

# --- format things ---

def format_known(known: dict) -> str:
    lines = []
    for key, value in known.items():
        lines.append(f"- {key}: {value}")
    return "\n".join(lines)

def format_missing(missing: list[str]) -> str:
    lines = []
    for key in missing:
        lines.append(f"- {key}")
    return "\n".join(lines)

def format_age(age: int):
    return f"The user is {age} years old"

def format_injury_history(injuries: list[str]):
    curr = "Has suffered the following injuries:"
    for inj in injuries:
        curr += f"\n- {inj}"
    return curr

def format_days_per_week(days: int):
    return f"wants to run {days} times per week"

def format_beginner_info(state: models.State):
    return [
        f"has a current activity level of: {state.activity_level}"
    ]

def format_race_info(race: models.Race):
    curr = f"ran a {race.distance}"
    if race.finish_time:
        curr += f" in {race.finish_time}"
    if race.date:
        curr += str(race.date)
    return curr

def format_advanced_info(state: models.State):
    return [
        f"currently runs {state.distance_per_week} {state.preferred_distance_unit} per week",
        f""
    ]
def format_user_info(state: models.State):
    infos = [
        format_age(state.age),
        str(state.goal),
        format_days_per_week(state.days_per_week)
    ]
    if state.injury_history:
        infos.append(format_injury_history(state.injury_history))
    if state.user_level == "beginner":
        additional_info = format_beginner_info(state)
    else:
        additional_info = format_advanced_info(state)
    infos.extend(additional_info)
    return "\n".join(infos)