import models
import utils
from typing import TypedDict
from langchain.messages import AIMessage

def interviewer(state: models.State) -> "InterviewResult":
    known, missing = utils.get_profile_status(state)
    if missing:
        system_prompt = utils.prompt(f"""
            You are a professional running coach.
            
            CURRENT PROFILE STATUS:
            - User Level: {state.user_level}
            - Known Info: {known}
            - MISSING INFO: {missing}
            
            YOUR GOAL:
            You need to collect the MISSING INFO. 
            1. Ask specifically for the missing fields.
            2. Do NOT ask about 'Known Info' - we already have that.
            3. Try to group related items into a single question, without overwhelming the user.
            goal mismatch (e.g. user wants to run a 5k in 15 minutes training once a week), address ONLY that. Do not ask for other data until resolved.
            4. Keep a conversational tone, acknowledge the user responses when it makes sense, don't make it sound like an interrogation
            5. If there is a safety warning (e.g. the user has low activity levels, has an history of injuries but wants to jump into a marathon) or 
        """)
        interviewer_gpt = utils.gpt.with_structured_output(models.build_info_request_model(missing))
        response = interviewer_gpt.invoke(utils.with_system_prompt(state.messages, system_prompt))
        return {"awaiting_fields": response.awaiting_fields, "messages": AIMessage(content=response.question)}

    system_prompt=utils.prompt(f"""
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
    """)

    response = utils.gpt.invoke(utils.with_system_prompt(state.messages, system_prompt))
    return {"messages": AIMessage(content=response.content[0]["text"])}

class InterviewResult(TypedDict):
    messages: str
    awaiting_fields: list[str] | None = None
