import utils
import models
from langchain.messages import HumanMessage

def is_beginner(state: models.State):
    if not state.messages:
        print(utils.prompt("""
            Welcome to the running coach agent!
            I'm here to help you with your running goals. 
            Are you new to running or are you an experienced runner looking to improve?
        """))
    else:
        print("Do you consider yourself a beginner?")
    
    user_input = input("Your response: ")
    return {
        "messages": [HumanMessage(content=user_input)]
    }


def get_user_info(state: models.State):
    print("Running coach: ", end="")
    print(state.messages[-1].content[0]["text"])
    user_input = input("Your response: ")
    return {
        "messages": [HumanMessage(content=user_input)]
    }
