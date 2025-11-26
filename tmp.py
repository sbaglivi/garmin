# own
import models
# others
from dotenv import load_dotenv
from datetime import date
from langgraph.graph import StateGraph, START, END
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langgraph.graph.message import AnyMessage
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

def today():
    return date.today().isoformat()


sysprompt = "\n    You are an expert at extracting structured data from user messages.\n    We're gathering information to build a running profile.\n    If the user gives a relative date, convert it to an absolute ISO date using datetime.now() as the reference. Do not return relative expressions.\n\n    Information we already have: \n    - days_per_week: 4\n- preferred_distance_unit: miles\n- age: 29\n- injury_history: ['Knee discomfort related to patellar tendon (resolved)', 'Sharp pain in right foot after marathon training (resolved)', 'Mild pain in right hip (currently improving)']\n- distance_per_week: 30.0\n\n    We're looking for the following fields:\n    - goal\n- recent_races\n    "
aimsg = "Thanks for sharing that history with me; it helps a lot! Given your recent mild hip pain, I recommend being cautious with your training intensity and progression as you prepare for the half marathon. \n\nNow, could you tell me about any recent races you've completed? This will help me gauge your current fitness level."
usmsg = "about 3 months ago, I ran my first marathon in 3h30mins"
code_execution = {
    "type": "code_interpreter",
    "container": {"type": "auto", "memory_limit": "1g"}
}

def langg_no_tools():
    gpt = ChatOpenAI(model_name="gpt-4o-mini", use_responses_api=True)
    extr_gpt = gpt.with_structured_output(models.Goal)

    sysprompt = f"""
    You are an expert at extracting structured data from user messages.
    We're gathering information to build a running profile.
    For the race date:
    - If the user provides an absolute date, fill only date.absolute.
    - If the user provides a relative date, fill only date.relative with the exact user wording.
    - Never convert relative dates into absolute dates.
    - Never infer dates that were not provided.

    Information we already have: 
    - days_per_week: 4
    - preferred_distance_unit: miles
    - age: 29
    - injury_history: ['Knee discomfort related to patellar tendon (resolved)', 'Sharp pain in right foot after marathon training (resolved)', 'Mild pain in right hip (currently improving)']
    - distance_per_week: 30.0

    We're looking for the following fields:
    - goal
    - recent_races
    """
    inp = {
    "messages": [
        SystemMessage(sysprompt),
        AIMessage(aimsg),
        HumanMessage(usmsg)
    ]
    }
    response = extr_gpt.invoke(inp["messages"])
    print(response)

def langg():
    gpt = ChatOpenAI(model_name="gpt-4o-mini", use_responses_api=True)
    with_code_ex = gpt.bind_tools([code_execution])
    extr_gpt = with_code_ex.with_structured_output(models.Goal)

    inp = {
    "messages": [
        SystemMessage(sysprompt),
        AIMessage(aimsg),
        HumanMessage(usmsg)
    ]
    }
    response = extr_gpt.invoke(inp["messages"])
    print(response)

def direct():
    client = OpenAI()
    newi = [
        {"role": "assistant", "content": aimsg},
        {"role": "user", "content": usmsg}
    ]
    response = client.responses.parse(
        model="gpt-4o-mini", 
        instructions=sysprompt, 
        input=newi,
        text_format=models.Goal,
        tools=[code_execution],
        parallel_tool_calls=False
    )
    print(response.output_parsed)

langg_no_tools()