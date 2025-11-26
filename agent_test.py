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
    state = models.AgentState(
        user_level="advanced",
        messages=[
            umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months."),
        ]
    )
    response = agent.interviewer_node(state)
    print(response["messages"])

def test_extractor_node():
    state = models.AgentState(
        user_level="advanced",
        messages=[
            umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months."),
            amsg("Got it, 30 miles a week is a solid base! Since you’re aiming for a half marathon, let’s discuss your training frequency. How many days per week do you plan to run?"),
            umsg("I can run about 4 days a week."),
        ]
    )
    response = agent.extractor_node(state)
    print(response)

def test():
    graph = agent.build_graph().compile(checkpointer=memory)
    cfg = {
            "configurable": {"thread_id": str(uuid4())}
        }
    graph.update_state(
        config=cfg,
        values=models.AgentState(user_level="advanced", messages=[umsg("I usually run about 30 miles a week, and I want to train for a half marathon in 3 months.")]),
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

def main():
    # test_interviewer_node()
    test2()

if __name__ == "__main__":
    main()