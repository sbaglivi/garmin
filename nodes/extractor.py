import models
import utils
from typing import Any

def extractor(state: models.State) -> dict[str, Any]:
    """Extracts profile data from user input and updates state."""

    known, missing = utils.get_profile_status(state)

    if missing:
        system_prompt = utils.prompt(f"""
            You are an expert at extracting structured data from user messages.
            We're gathering information to build a running profile.
            For the race date:
            - If the user provides an absolute date, fill only date.absolute.
            - If the user provides a relative date, fill only date.relative with the exact user wording.
            - Never convert relative dates into absolute dates.
            - Never infer dates that were not provided.

            Information we already have: 
            {utils.format_known(known)}

            We're looking for the following fields:
            {utils.format_missing(missing)}
        """)
    else:
        system_prompt=utils.prompt(f"""
            You are an expert at extracting structured corrections from user messages.
            All required fields are already collected. 
            Your task is ONLY to resolve the following contradictions or issues:

            VERIFIER-IDENTIFIED ISSUES:
            {state.coherence_check.reasoning}

            KNOWN DATA:
            {utils.format_known(known)}

            RULES:
            1. Update ONLY fields directly related to the issues listed above.
            2. Do NOT extract new fields beyond those issues.
            3. Do NOT overwrite unrelated known information.
            4. If the user's latest message clarifies or corrects a field involved in an issue, update it.
            5. If the message does not address an issue, leave all structured fields unchanged.
            6. Never infer or guess values.

            Return a partial update containing only the fields the user clarified.
        """)
    response_format = models.BeginnerUserProfile if state.user_level == "beginner" else models.AdvancedUserProfile
    extr_gpt = utils.gpt.with_structured_output(response_format)
    response = extr_gpt.invoke(utils.with_system_prompt(state.messages[-2:], system_prompt))

    new_state = {}
    for k,v in models.iter_populated_fields(response):
        new_state[k] = v

    if missing:
        progress = False
        for field in state.awaiting_fields:
            if getattr(response, field, None) is not None:
                progress = True
                break
        new_state["failure_count"] = 0 if progress else state.failure_count + 1

    return new_state
