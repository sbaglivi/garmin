import os
import json
import garth
from garth.exc import GarthException
from getpass import getpass

SAVE_PATH="./garth"
def _login():
    email = input("Enter email address: ")
    password = getpass("Enter password: ")
    garth.login(email, password)
    garth.save(SAVE_PATH)

def login():
    if os.path.isdir(SAVE_PATH):
        garth.resume(SAVE_PATH)
        try:
            garth.client.username
        except GarthException:
            _login()
    else:
        _login()

def main():
    login()
    month = 11
    calendar = garth.connectapi(f"/calendar-service/year/2025/month/{month}")
    with open(f"data/monthly/calendar{month}.json", "w") as f:
        json.dump(calendar, f, indent=2)
    # tmp = garth.connectapi("/activity-service/activity/20264714507")
    # with open("activity.json", "w") as f: 
    #     json.dump(tmp, f)


main()
