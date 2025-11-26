import agent
import sqlite3
from langgraph.checkpoint.sqlite import SqliteSaver
# The states are returned in reverse chronological order.
conn = sqlite3.connect("checkpoints.sqlite", check_same_thread=False)
memory = SqliteSaver(conn)
graph = agent.build_graph().compile(checkpointer=memory)
tid = "4f09ac59-34dc-4887-ad30-4cdc12095c11"
cfg = {
        "configurable": {"thread_id": tid}
    }
states = list(graph.get_state_history(cfg))

cid = "1f0cabd8-18d7-6646-800b-62956cf1e432"
for state in states:
    if state.config["configurable"]["checkpoint_id"] == cid:
        print(state.values["messages"][-1])
        print(state.next)
    continue
    print(state.config["configurable"]["checkpoint_id"])
    print()
