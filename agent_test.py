import models
from uuid import uuid4
import agent
import sqlite3
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.checkpoint.sqlite import SqliteSaver

conn = sqlite3.connect("checkpoints.sqlite", check_same_thread=False)
memory = SqliteSaver(conn)

def umsg(content: str) -> dict:
    # return {"role": "user", "content": content}
    return HumanMessage(content=content)

def amsg(content: str) -> dict:
    return AIMessage(content=content)
    # return {"role": "assistant", "content": content}


def test_interviewer_node():
    state = models.State(
        user_level="advanced",
        messages=[
            umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months."),
        ]
    )
    response = agent.interviewer_node(state)
    print(response["messages"])

def test_extractor_node():
    state = models.State(
        user_level="advanced",
        messages=[
            umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months."),
            amsg("Got it, 30 miles a week is a solid base! Since you’re aiming for a half marathon, let’s discuss your training frequency. How many days per week do you plan to run?"),
            umsg("I can run about 4 days a week."),
        ]
    )
    response = agent.extractor_node(state)
    print(response)

def test_extractor_node_incomplete_data():
    state = models.State(
        user_level="advanced",
        messages=[
            umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months."),
            amsg("Got it, 30 miles a week is a solid base! Have you ran any recent race? This will help me understand your current fitness level"),
            umsg("I've ran my first marathon, around a month ago"),
        ]
    )
    response = agent.extractor_node(state)
    recent_race = response.get("recent_race")
    assert recent_race, f"model should have created data for a recent race: {recent_race}"
    assert recent_race.get("finish_time") is None, f"recent race finish time not be populated if the completion time is missing: {recent_race}"

def test():
    graph = agent.build_graph().compile(checkpointer=memory)
    cfg = {
            "configurable": {"thread_id": str(uuid4())}
        }
    graph.update_state(
        config=cfg,
        values=models.State(user_level="advanced", messages=[umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months.")]),
        as_node="triage_node"
    )
    final_state = graph.invoke(None, config=cfg)
    print(final_state)

def test2():
    graph = agent.build_graph().compile(checkpointer=memory)
    tid = "4f09ac59-34dc-4887-ad30-4cdc12095c11"
    cid = "1f0cabd8-18d7-6646-800b-62956cf1e432"
    cfg = {
            "configurable": {"thread_id": tid, "checkpoint_id": cid}
        }
    
    final_state = graph.invoke(None, config=cfg)
    print(final_state)

def test_incoherent_plan():
    msgs=[
        umsg("Hi, I've basically never ran since I was a teenager, so I'm a beginner"),
        amsg("Got it, good job on choosing to start running! What's your current activity level? Do you practice any other sport?"),
        umsg("Up to last year I went to the gym once or twice a week, this year I've been busy so I haven't done much"),
        amsg("Understood, sometimes it's hard to find time for exercise. What's your age?"),
        umsg("I'm 40"),
        amsg("Nice, you have plenty of time to get fit! Are you currently dealing with any injury or pain?"),
        umsg("My right knee often hurts, right under the rotula. Also sometimes I get back pain, probably from sitting too much."),
        amsg("Sorry to hear that, many people health improves after they start being more active. Do you have a specific goal in mind - like a race that you'd like to participate in - or are you just looking to improve your fitness?"),
        umsg("I'd like to run a marathon, a month from now"),
    ]
    state = models.State.beginner(
        msgs, "sedentary", 40, ["pain under the right knee", "low back pain sometimes"], 
        3, models.Goal(type="marathon", target_date=models.RaceDate(relative="in a month"))
    )
    response: models.CoherenceCheck = agent.verifier_node(state)["coherence_check"]
    assert not response.ok, f"the user fitness levels and his goals are incompatible: {response}"
    print(response)
    state.coherence_check = response
    response = agent.interviewer_node(state)['messages']
    print(response)
    # content=[{'type': 'text', 'text': "A marathon in a month may not be realistic given your current activity level and the injuries you've mentioned. It would be safer to focus on gradually building your running ability first. Would you be open to setting a shorter-term goal, like a 5K or 10K, instead? This would allow you to prepare properly while considering your knee and back issues.", 'annotations': [], 'id': 'msg_0b050750b1b75e14006929be5e2850819fbe05cf3d0f58b308'}] additional_kwargs={} response_metadata={'id': 'resp_0b050750b1b75e14006929be5d7144819f8e90e97c940ef47d', 'created_at': 1764343389.0, 'metadata': {}, 'model': 'gpt-4o-mini-2024-07-18', 'object': 'response', 'service_tier': 'default', 'status': 'completed', 'model_provider': 'openai', 'model_name': 'gpt-4o-mini-2024-07-18'} id='resp_0b050750b1b75e14006929be5d7144819f8e90e97c940ef47d' usage_metadata={'input_tokens': 650, 'output_tokens': 73, 'total_tokens': 723, 'input_token_details': {'cache_read': 0}, 'output_token_details': {'reasoning': 0}}


def main():
    # test_interviewer_node()
    # test2()
    # test_extractor_node_incomplete_data()
    test_incoherent_plan()

if __name__ == "__main__":
    main()