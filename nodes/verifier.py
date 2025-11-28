import models
import utils

def verifier(state: models.State) -> dict[str, models.CoherenceCheck]:
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
    if not response.ok:
        state.failure_count += 1
    return {"coherence_check": response}