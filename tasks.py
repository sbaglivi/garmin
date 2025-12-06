from models.inputs import UserProfile
from model_utils import to_llm_context
from verifier import agent as verifier_agent
from database import async_session
from db_models.user_data import UserData
from sqlalchemy import select


async def run_verification(user_id: int, profile_dict: dict):
    """
    Background task to run the verifier agent on a user profile.
    Updates the user_data record with the result.
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
                    await db.commit()
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
                await db.commit()

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
