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
        required_keys += ["distance_per_week", "recent_races"]

    # 2. Calculate Missing vs Known
    missing = []
    known = {}
    
    for key in required_keys:
        value = getattr(state, key, None)
        if value is None:
            missing.append(key)
        else:
            known[key] = value
            
    return known, missing

def interviewer_node(state: models.AgentState):
    known, missing = get_profile_status(state)
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
    # response = client.responses.create(
    #     model="gpt-4o-mini", 
    #     instructions=system_prompt, 
    #     input=[m.model_dump() for m in state.messages],
    # )
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
    response_format = models.BeginnerUserProfile if state.user_level == "beginner" else models.AdvancedUserProfile
    extr_gpt = gpt.with_structured_output(response_format)

    # response = client.responses.parse(
    #     model="gpt-4o-mini", 
    #     instructions=system_prompt, 
    #     text_format=response_format,
    # )
    response = extr_gpt.invoke(with_system_prompt(state.messages[-2:], system_prompt))
    new_state = {}
    for k,v in models.iter_populated_fields(response):
        new_state[k] = v

    return new_state

def all_fields_collected(state: models.AgentState):
    _known, missing = get_profile_status(state)
    if len(missing) == 0:
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

def build_graph():
    agent_builder = StateGraph(models.AgentState)

    # Add nodes
    agent_builder.add_node("get_first_user_input", get_first_user_input)
    agent_builder.add_node("triage_node", triage_node)
    agent_builder.add_node("interviewer_node", interviewer_node)
    agent_builder.add_node("get_user_input", get_user_input)
    agent_builder.add_node("extractor_node", extractor_node)

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
        [END, "interviewer_node"]
    )

    return agent_builder

if __name__ == "__main__":
    agent = build_graph().compile()
    result = agent.invoke(models.AgentState(messages=[]))
    print(result)