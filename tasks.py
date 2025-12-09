import textwrap
from models.inputs import UserProfile
from model_utils import to_llm_context, get_plan_parameters
from verifier import agent as verifier_agent
from macroplanner import agent as macroplanner_agent, TrainingStrategy
from weeks_builder import (
    agent as weekly_agent,
    calculate_weekly_progression,
    build_weekly_planner_prompt,
)
from database import async_session
from db_models.user_data import UserData
from sqlalchemy import select


async def run_verification(user_id: int, profile_dict: dict):
    """
    Background task to run the verifier agent on a user profile.
    Updates the user_data record with the result.
    If verification passes (outcome=ok), triggers macroplanner.
    """
    async with async_session() as db:
        try:
            # Reconstruct UserProfile from dict
            profile = UserProfile.model_validate(profile_dict)

            # Check if verification is needed
            if not profile.needs_evaluation:
                result = await db.execute(
                    select(UserData).where(UserData.user_id == user_id)
                )
                user_data = result.scalar_one_or_none()
                if user_data:
                    user_data.verification_status = "completed"
                    user_data.verification_result = {
                        "outcome": "ok",
                        "message": "No verification needed for this goal type.",
                        "proposals": []
                    }
                    user_data.macroplan_status = "pending"
                    await db.commit()
                # Trigger macroplanner for auto-approved profiles
                await run_macroplanner(user_id, profile_dict)
                return

            # Run the verifier
            llm_context = to_llm_context(profile)
            evaluation = await verifier_agent.run(
                f"Here is the user profile:\n{llm_context}"
            )

            # Update the database with the result
            result = await db.execute(
                select(UserData).where(UserData.user_id == user_id)
            )
            user_data = result.scalar_one_or_none()

            if user_data:
                user_data.verification_status = "completed"
                user_data.verification_result = evaluation.output.model_dump(mode="json")
                # If verification passed, trigger macroplanner
                if evaluation.output.outcome == "ok":
                    user_data.macroplan_status = "pending"
                await db.commit()

                # Trigger macroplanner if verification passed
                if evaluation.output.outcome == "ok":
                    await run_macroplanner(user_id, profile_dict)

        except Exception as e:
            # Log error and update status
            print(f"Verification error for user {user_id}: {e}")

            result = await db.execute(
                select(UserData).where(UserData.user_id == user_id)
            )
            user_data = result.scalar_one_or_none()

            if user_data:
                user_data.verification_status = "error"
                user_data.verification_result = {"error": str(e)}
                await db.commit()


async def run_macroplanner(user_id: int, profile_dict: dict):
    """
    Background task to run the macroplanner agent on a user profile.
    Updates the user_data record with the training_overview.
    Then triggers first week generation.
    """
    async with async_session() as db:
        try:
            # Reconstruct UserProfile from dict
            profile = UserProfile.model_validate(profile_dict)

            # Get plan parameters
            params = get_plan_parameters(profile)
            params["user_profile_json"] = profile.model_dump_json()

            user_prompt = textwrap.dedent("""
Please generate the Training Strategy for this user:

### Context Variables
- **Total Weeks Available**: {duration_weeks}
- **First Week**: {first_week_context}

### User Profile
{user_profile_json}
            """.strip().format(**params))

            # Run the macroplanner
            strategy = await macroplanner_agent.run(user_prompt)
            strategy_dict = strategy.output.model_dump(mode="json")

            # Update the database with the result
            result = await db.execute(
                select(UserData).where(UserData.user_id == user_id)
            )
            user_data = result.scalar_one_or_none()

            if user_data:
                user_data.macroplan_status = "completed"
                user_data.training_overview = strategy_dict
                user_data.weekly_plan_status = "pending"
                await db.commit()

                # Trigger first week generation
                await run_weekly_planner(user_id, profile_dict, strategy_dict)

        except Exception as e:
            # Log error and update status
            print(f"Macroplanner error for user {user_id}: {e}")

            result = await db.execute(
                select(UserData).where(UserData.user_id == user_id)
            )
            user_data = result.scalar_one_or_none()

            if user_data:
                user_data.macroplan_status = "error"
                user_data.training_overview = {"error": str(e)}
                await db.commit()


async def run_weekly_planner(user_id: int, profile_dict: dict, strategy_dict: dict):
    """
    Background task to generate the first week's detailed schedule.
    """
    async with async_session() as db:
        try:
            # Reconstruct models from dicts
            profile = UserProfile.model_validate(profile_dict)
            strategy = TrainingStrategy.model_validate(strategy_dict)

            # Calculate weekly progression targets
            weekly_targets = calculate_weekly_progression(profile, strategy)

            # Get first week target
            first_week_target = weekly_targets[0]

            # Build prompt and run agent
            prompt = build_weekly_planner_prompt(profile, first_week_target)
            weekly_schedule = await weekly_agent.run(prompt)

            # Update database
            result = await db.execute(
                select(UserData).where(UserData.user_id == user_id)
            )
            user_data = result.scalar_one_or_none()

            if user_data:
                user_data.weekly_plan_status = "completed"
                user_data.weekly_schedules = [weekly_schedule.output.model_dump(mode="json")]
                await db.commit()

        except Exception as e:
            print(f"Weekly planner error for user {user_id}: {e}")

            result = await db.execute(
                select(UserData).where(UserData.user_id == user_id)
            )
            user_data = result.scalar_one_or_none()

            if user_data:
                user_data.weekly_plan_status = "error"
                user_data.weekly_schedules = [{"error": str(e)}]
                await db.commit()
