import models
import utils
import nodes
from langgraph.graph import StateGraph, START, END

def all_fields_collected(state: models.State):
    _, missing = utils.get_profile_status(state)
    if len(missing) == 0:
        return "verifier_node"
    
    if state.failure_count >= 3:
        return END
    
    return "interviewer_node"
    
def information_coherent(state: models.State):
    if state.coherence_check.ok:
        return "planner_node"
    
    if state.failure_count >= 3:
        return END
    
    return "interviewer_node"

def build_graph():
    agent_builder = StateGraph(models.State)

    # nodes
    agent_builder.add_node("is_beginner_node", nodes.is_beginner)
    agent_builder.add_node("interviewer_node", nodes.interviewer)
    agent_builder.add_node("get_user_info", nodes.get_user_info)
    agent_builder.add_node("extractor_node", nodes.extractor)
    agent_builder.add_node("verifier_node", nodes.verifier)
    agent_builder.add_node("planner_node", nodes.planner)

    # linear edges
    agent_builder.add_edge(START, "is_beginner_node")
    agent_builder.add_edge("is_beginner_node", "interviewer_node")
    agent_builder.add_edge("interviewer_node", "get_user_info")
    agent_builder.add_edge("get_user_info", "extractor_node")

    # conditional edges
    agent_builder.add_conditional_edges(
        "extractor_node",
        all_fields_collected,
        ["verifier_node", "interviewer_node", END]
    )
    agent_builder.add_conditional_edges(
        "verifier_node", 
        information_coherent,
        ["interviewer_node", "planner_node", END]
    )

    # still need: high level planner -> check with user, else add user comments and remake until ok from user
    # workout planner: uses high level plan + data from user to create a specific set of sessions -> again loop with confirmation / feedback from user
    # once that's done, we should have: user profile, overview of plan, specific sessions. Now maybe we ask the user when he'd like to review the sessions,
    # and plan an email / a task to be done for that window of time, where we ask how the workouts went, and help the user plan the next ones!
    # we need to stub all of these steps, we can't go through the whole process each time

    return agent_builder

def main():
    agent = build_graph().compile()
    result = agent.invoke(models.State(messages=[]), {"recursion_limit": 100})
    print(result)

if __name__ == "__main__":
    main()