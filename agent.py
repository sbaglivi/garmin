# own
import models
# others
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langgraph.graph.message import AnyMessage
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()
client = OpenAI()

gpt = ChatOpenAI(model_name="gpt-4o-mini", use_responses_api=True)
triage_gpt = gpt.with_structured_output(models.TriageResult)

def with_system_prompt(messages: list[models.AnyMessage], system_prompt: str) -> list[dict]:
    return [SystemMessage(content=system_prompt)] + messages

def triage_node(state: models.AgentState):
    """Tries to classify the user as beginner or advanced"""


    instructions = "Analyze the user input. Classify them as 'beginner' (new, low mileage) or 'advanced' (experienced, understands pace/zones). If unclear, choose 'unknown'."
    last_message = state.messages[-1].content
    # response = client.responses.parse(
    #     model="gpt-4o-mini", 
    #     instructions=instructions, 
    #     input=last_message,
    #     text_format=models.TriageResult,
    # )
    # response.output_parsed is the pydantic model
    
    response = triage_gpt.invoke(with_system_prompt(state.messages, instructions))
    return {
        "user_level": response.user_level
    }

def beginner_node(state: models.AgentState):
    """Handles beginner users"""
    print("we have a beginner on our hands!")
    return {"messages": []}

def advanced_node(state: models.AgentState):
    """Handles advanced users"""
    print("an advanced runner in the wild, wonder what his mileage is?")
    return {"messages": []}

def triage_done(state: models.AgentState):
    if state.user_level == "unknown":
        return "get_user_input"
    
    return "interviewer_node"
    
def race_results_complete(state: models.AgentState):
    if not state.recent_race:
        return False
    if state.recent_race.distance is None or state.recent_race.finish_time is None:
        return False
    return True

def get_profile_status(state: models.AgentState):
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

def interviewer_node(state: models.AgentState):
    known, missing = get_profile_status(state)
    if missing:
        system_prompt = f"""
        You are a professional running coach.
        
        CURRENT PROFILE STATUS:
        - User Level: {state.user_level}
        - Known Info: {known}
        - MISSING INFO: {missing}
        
        YOUR GOAL:
        You need to collect the MISSING INFO. 
        1. Ask specifically for the missing fields.
        2. Do NOT ask about 'Known Info' - we already have that.
        3. Ask for 1 or 2 items at a time. Don't overwhelm the user.
        4. Keep the tone encouraging.
        5. If there is a safety warning (e.g. the user has low activity levels, has an history of injuries but wants to jump into a marathon) or 
        goal mismatch (e.g. user wants to run a 5k in 15 minutes training once a week), address ONLY that. Do not ask for other data until resolved.
        6. If the user just gave you data, acknowledge it briefly ("Got it, 50km/week is a solid base") before asking the next question.
        """
        interviewer_gpt = gpt.with_structured_output(models.build_info_request_model(missing))
        response = interviewer_gpt.invoke(with_system_prompt(state.messages, system_prompt))
        return {"awaiting_fields": response.awaiting_fields, "messages": response.question}

    system_prompt=f"""
    You are a professional running coach.

    PROFILE SUMMARY:
    - User Level: {state.user_level}
    - Known Info: {known}

    VERIFIER-IDENTIFIED ISSUES:
    {state.coherence_check.reasoning}

    VERIFIER SUGGESTED CHANGES:
    {state.coherence_check.suggested_changes}

    YOUR GOAL:
    Resolve the issues listed above. 
    1. Ask ONLY about the items mentioned in the verifier issues. 
    2. Do NOT ask for any other data; all required fields are already collected. 
    3. Address issues one at a time. 
    4. If the user's latest message provides relevant clarifying info, acknowledge it briefly before continuing. 
    5. Keep questions specific, practical, and focused on resolving contradictions or unsafe aspects of the training goals.
    6. Once all issues are resolved, state clearly that the profile is now coherent.
    """

    response = gpt.invoke(with_system_prompt(state.messages, system_prompt))
    return {"messages": response}

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

def extractor_node(state: models.AgentState):
    """Extracts profile data from user input and updates state."""

    known, missing = get_profile_status(state)

    if missing:
        system_prompt = f"""
        You are an expert at extracting structured data from user messages.
        We're gathering information to build a running profile.
        For the race date:
        - If the user provides an absolute date, fill only date.absolute.
        - If the user provides a relative date, fill only date.relative with the exact user wording.
        - Never convert relative dates into absolute dates.
        - Never infer dates that were not provided.

        Information we already have: 
        {format_known(known)}

        We're looking for the following fields:
        {format_missing(missing)}
        """
    else:
        system_prompt=f"""
        You are an expert at extracting structured corrections from user messages.
        All required fields are already collected. 
        Your task is ONLY to resolve the following contradictions or issues:

        VERIFIER-IDENTIFIED ISSUES:
        {state.coherence_check.reasoning}

        KNOWN DATA:
        {format_known(known)}

        RULES:
        1. Update ONLY fields directly related to the issues listed above.
        2. Do NOT extract new fields beyond those issues.
        3. Do NOT overwrite unrelated known information.
        4. If the user's latest message clarifies or corrects a field involved in an issue, update it.
        5. If the message does not address an issue, leave all structured fields unchanged.
        6. Never infer or guess values.

        Return a partial update containing only the fields the user clarified.
        """
    response_format = models.BeginnerUserProfile if state.user_level == "beginner" else models.AdvancedUserProfile
    extr_gpt = gpt.with_structured_output(response_format)

    response = extr_gpt.invoke(with_system_prompt(state.messages[-2:], system_prompt))
    if missing:
        progress = False
        for field in state.awaiting_fields:
            if getattr(response, field) is not None:
                progress = True
                break
        if progress:
            state.failure_count = 0
        else:
            state.failure_count += 1

    new_state = {}
    for k,v in models.iter_populated_fields(response):
        new_state[k] = v

    return new_state

def all_fields_collected(state: models.AgentState):
    _known, missing = get_profile_status(state)
    if len(missing) == 0:
        return "verifier_node"
    
    if state.failure_count >= 3:
        return END
    
    return "interviewer_node"
    
USER_PROMPT = """
welcome to the running coach agent!
I'm here to help you with your running goals. 
Are you new to running or are you an experienced runner looking to improve?
"""
def get_first_user_input(state: models.AgentState):
    if not state.messages:
        print(USER_PROMPT)
    else:
        print("do you consider yourself a beginner?")
    
    user_input = input("Your response: ")
    return {
        "messages": [HumanMessage(content=user_input)]
    }



def get_user_input(state: models.AgentState):
    print("Running coach: ", end="")
    print(state.messages[-1].content[0]["text"])
    user_input = input("Your response: ")
    return {
        "messages": [HumanMessage(content=user_input)]
    }

def format_goal(goal: models.Goal):
    assert goal is not None, "was asked to format a goal which is none"

    curr = f"has a goal of {goal.type}"
    if goal.target_date:
        curr += str(goal.target_date)
    if goal.target_time:
        curr += f"with a time of {goal.target_time}"
        
    return curr

def format_age(age: int):
    return f"The user is {age} years old"

def format_injury_history(injuries: list[str]):
    curr = "Has suffered the following injuries:"
    for inj in injuries:
        curr += f"\n- {inj}"
    return curr

def format_days_per_week(days: int):
    return f"wants to run {days} times per week"

def format_beginner_info(state: models.AgentState):
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

def format_advanced_info(state: models.AgentState):
    return [
        f"currently runs {state.distance_per_week} {state.preferred_distance_unit} per week",
        f""
    ]
def format_user_info(state: models.AgentState):
    infos = [
        format_age(state.age),
        format_goal(state.goal),
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

def verifier_node(state: models.AgentState) -> dict[str, models.CoherenceCheck]:
    prompt=f"""You are an expert running coach.
    These are the informations we've gathered about the user:
    {format_user_info(state)}

    Your job is to understand whether the user goal, given his current fitness and health situation seems sensible.
    Address concerns like:
    - Is the user's goal realistic given training history?
    - Are race times consistent with weekly mileage?
    - Do injury flags conflict with high-intensity demands?
    - Do inputs contradict each other (e.g. advanced mileage but beginner self-description)?
    - Is the plan duration compatible with the goal?

    If you notice an issue, provide a simple explanation of what you think should be improved and a suggestion on how to adapt the goal or training plan.
"""
    verifier_gpt = gpt.with_structured_output(models.CoherenceCheck)
    response = verifier_gpt.invoke([SystemMessage(content=prompt)])
    if not response.is_coherent:
        state.failure_count += 1
    return {"coherence_check": response}

def all_ok(state: models.AgentState):
    if state.coherence_check.is_coherent:
        return "planner_node"
    
    if state.failure_count >= 3:
        print("user is not collaborating, now I'm pissed")
        return END
    
    return "interviewer_node"

def planner_node(state: models.AgentState):
    print("reached planner, gz!")
    return {}

def build_graph():
    agent_builder = StateGraph(models.AgentState)

    # Add nodes
    agent_builder.add_node("get_first_user_input", get_first_user_input)
    agent_builder.add_node("triage_node", triage_node)
    agent_builder.add_node("interviewer_node", interviewer_node)
    agent_builder.add_node("get_user_input", get_user_input)
    agent_builder.add_node("extractor_node", extractor_node)
    agent_builder.add_node("verifier_node", verifier_node)
    agent_builder.add_node("planner_node", planner_node)

    # Add edges to connect nodes
    agent_builder.add_edge(START, "get_first_user_input")
    agent_builder.add_edge("get_first_user_input", "triage_node")
    agent_builder.add_conditional_edges(
        "triage_node",
        triage_done,
        ["get_first_user_input", "interviewer_node"]
    )
    agent_builder.add_edge("interviewer_node", "get_user_input")
    agent_builder.add_edge("get_user_input", "extractor_node")
    agent_builder.add_conditional_edges(
        "extractor_node",
        all_fields_collected,
        ["verifier_node", "interviewer_node", END]
    )
    agent_builder.add_conditional_edges(
        "verifier_node", 
        all_ok,
        ["interviewer_node", "planner_node", END]
    )
    # still need: high level planner -> check with user, else add user comments and remake until ok from user
    # workout planner: uses high level plan + data from user to create a specific set of sessions -> again loop with confirmation / feedback from user
    # once that's done, we should have: user profile, overview of plan, specific sessions. Now maybe we ask the user when he'd like to review the sessions,
    # and plan an email / a task to be done for that window of time, where we ask how the workouts went, and help the user plan the next ones!
    # we need to stub all of these steps, we can't go through the whole process each time

    return agent_builder

if __name__ == "__main__":
    agent = build_graph().compile()
    result = agent.invoke(models.AgentState(messages=[]))
    print(result)