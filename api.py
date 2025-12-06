import asyncio
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.inputs import UserProfile
from database import init_db, get_db
from db_models.user import User
from db_models.user_data import UserData
from auth import (
    UserCreate,
    UserResponse,
    Token,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from tasks import run_verification


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Garmin Training Plan API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@app.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user.id)
    return Token(access_token=access_token, token_type="bearer")


@app.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


@app.post("/profiles")
async def create_profile(
    profile: UserProfile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    profile_data = profile.model_dump(mode="json")

    # Check if user already has data
    result = await db.execute(select(UserData).where(UserData.user_id == current_user.id))
    user_data = result.scalar_one_or_none()

    if user_data:
        user_data.profile = profile_data
        user_data.verification_status = "pending"
        user_data.verification_result = None
    else:
        user_data = UserData(
            user_id=current_user.id,
            profile=profile_data,
            verification_status="pending",
        )
        db.add(user_data)

    await db.commit()

    # Start background verification task
    asyncio.create_task(run_verification(current_user.id, profile_data))

    return {"message": "Profile saved", "verification_status": "pending"}


class VerificationResponse(BaseModel):
    status: str  # "pending" | "completed" | "error" | None
    result: dict | None = None


@app.get("/profiles/verification", response_model=VerificationResponse)
async def get_verification(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(UserData).where(UserData.user_id == current_user.id))
    user_data = result.scalar_one_or_none()

    if not user_data:
        raise HTTPException(status_code=404, detail="No profile found")

    return VerificationResponse(
        status=user_data.verification_status or "none",
        result=user_data.verification_result,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
