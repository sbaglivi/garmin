import models
import utils

def classifier(state: models.State):
    instructions = "Analyze the user input. Classify them as 'beginner' or 'advanced'. If unclear, choose 'unknown'."
    triage_gpt = utils.gpt.with_structured_output(models.TriageResult)
    response = triage_gpt.invoke(utils.with_system_prompt(state.messages, instructions))
    return {"user_level": response.user_level}
