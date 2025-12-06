import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.inputs import UserProfile

app = FastAPI(title="Garmin Training Plan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROFILES_DIR = Path(__file__).parent / "profiles"
PROFILES_DIR.mkdir(exist_ok=True)


@app.post("/profiles")
def create_profile(profile: UserProfile):
    filename = f"{profile.name.strip().lower().replace(' ', '_')}.json"
    filepath = PROFILES_DIR / filename

    profile_data = profile.model_dump(mode="json")

    with open(filepath, "w") as f:
        json.dump(profile_data, f, indent=2, default=str)

    return {"message": "Profile saved", "filename": filename}


@app.get("/health")
def health():
    return {"status": "ok"}
