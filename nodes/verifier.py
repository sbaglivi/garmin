import models
import utils

def verify_user_proposal(state: models.State):
    prompt=utils.prompt(f"""You are an expert running coach.
        These are the informations we've gathered about the user:
        {utils.format_user_info(state)}

        Your job is to understand whether the user goal, given his current fitness and health situation seems sensible.
        You had previously manifested uncertainties about the user profile with this reasoning: {state.coherence_check.reasoning}
        You therefore recommended these changes: {state.coherence_check.suggested_changes.to_lines()}

        The user was asked to confirm the changes but instead proposed this new version: {state.user_change_response.new_proposal.to_lines()}
        Attached are the conversation messages between the assistant and the user.

        Judge whether the user suggested changes are sufficient to solve your concerns, if not propose new changes, taking into account possible requests from the user last message.
        Don't be excessively rigid, if the user proposal is slightly outside your recommendation try to accomodate it.
    """)
    verifier_gpt = utils.gpt.with_structured_output(models.CoherenceCheck)
    response: models.CoherenceCheck = verifier_gpt.invoke(utils.with_system_prompt(state.messages[:-2], prompt))
    update = {"coherence_check": response} 
    if not response.ok:
        # reset failure since user is trying to cooperate
        update["failure_count"] = 0
    return update

def possibly_update_proposal(state: models.State):
    prompt=utils.prompt(f"""You are an expert running coach.
        These are the informations we've gathered about the user:
        {utils.format_user_info(state)}

        Your job is to understand whether the user goal, given his current fitness and health situation seems sensible.
        You had previously manifested uncertainties about the user profile with this reasoning: {state.coherence_check.reasoning}
        You therefore recommended these changes: {state.coherence_check.suggested_changes.to_lines()}

        The user was asked to confirm the changes but refused them.
        Attached are the conversation messages between the assistant and the user.

        Propose again changes that would fix your concerns with the user profile, taking into account possible requests from the user last message.
        Don't be excessively rigid.
    """)
    verifier_gpt = utils.gpt.with_structured_output(models.CoherenceCheck)
    response: models.CoherenceCheck = verifier_gpt.invoke(utils.with_system_prompt(state.messages[:-2], prompt))
    update = {"coherence_check": response} 
    update["failure_count"] = state.failure_count + 1
    return update

def verifier(state: models.State) -> dict[str, models.CoherenceCheck]:
    """
    a bit overloaded:
    - first iteration: check if profile is coherent
    - user accepted changes -> apply them and move on
    - user rejected changes but made new proposal 
        - accept: apply user changes and move on
        - reject: make new proposal that's a compromise maybe?
    - user rejected and no new proposal: read user message and create a new proposal
    """
    if state.coherence_check is None:
        prompt=utils.prompt(f"""You are an expert running coach.
            These are the informations we've gathered about the user:
            {utils.format_user_info(state)}

            Your job is to understand whether the user goal, given his current fitness and health situation seems sensible.
            Address concerns like:
            - Is the user's goal realistic given training history?
            - Are race times consistent with weekly mileage?
            - Do injury flags conflict with high-intensity demands?
            - Do inputs contradict each other (e.g. advanced mileage but beginner self-description)?
            - Is the plan duration compatible with the goal?

            If you notice an issue, provide a simple explanation of what you think should be improved and a suggestion on how to adapt the goal or training plan.
        """)
        verifier_gpt = utils.gpt.with_structured_output(models.CoherenceCheck)
        response: models.CoherenceCheck = verifier_gpt.invoke(utils.with_system_prompt([], prompt))
        update = {"coherence_check": response} 
        if not response.ok:
            update["failure_count"] = state.failure_count + 1
        return  update


    assert state.user_change_response is not None, "if coherence check is not none, verifier should see user response to suggested changes"
    user_resp = state.user_change_response
    if user_resp.accept:
        update = state.coherence_check.suggested_changes.model_dump()
        update["coherence_check"] = models.CoherenceCheck(ok=True, reasoning="user accepted changes", suggested_changes=None)
        return update
    
    if user_resp.new_proposal:
        # evaluate if satisfactory, if so apply changes, if not propose new ones
        return verify_user_proposal(state)
    
    # evaluate profile again, with last message from interviewer + user and see if a new proposal can be made
    return possibly_update_proposal(state)