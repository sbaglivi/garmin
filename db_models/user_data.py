from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class UserData(Base):
    __tablename__ = "user_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)

    profile: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    training_overview: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    weekly_schedules: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Verification state: "pending" | "completed" | "error" | None
    verification_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    verification_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Macroplanner state: "pending" | "completed" | "error" | None
    macroplan_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Weekly plan state: "pending" | "completed" | "error" | None
    weekly_plan_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    user: Mapped["User"] = relationship(back_populates="data")


# Avoid circular import
from db_models.user import User  # noqa: E402
