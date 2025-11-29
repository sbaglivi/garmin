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
        response_format = models.BeginnerUserProfile if state.user_level == "beginner" else models.AdvancedUserProfile
        extr_gpt = utils.gpt.with_structured_output(response_format)
        response = extr_gpt.invoke(utils.with_system_prompt(state.messages[-2:], system_prompt))
        new_state = {}
        for k,v in models.iter_populated_fields(response):
            new_state[k] = v

        progress = False
        for field in state.awaiting_fields:
            if getattr(response, field, None) is not None:
                progress = True
                break
        new_state["failure_count"] = 0 if progress else state.failure_count + 1

        return new_state
    else:
        system_prompt=utils.prompt(f"""
            You are an expert at extracting structured changes from user messages.
            Your task is to understand whether the user agrees to the suggested adaptations to its training plans and, if not, whether he makes a new proposal.
            If the user is not clear on accepting the suggestions, just flag it as a no.

            SUGGESTED CHANGES:
            {state.coherence_check.suggested_changes.to_lines()}
        """)
        extr_gpt = utils.gpt.with_structured_output(models.UserChangeResponse)
        response = extr_gpt.invoke(utils.with_system_prompt(state.messages[-2:], system_prompt))
        return {"user_change_response": response}

