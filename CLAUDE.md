# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a running training plan generator that uses LLMs (via pydantic-ai) to create personalized training plans based on user profiles, fitness levels, and race goals.

## Commands

### Python Backend
```bash
# Install dependencies (uses uv)
uv sync

# Run the macroplanner (generates high-level training strategy)
uv run python macroplanner.py

# Run the verifier test
uv run python verifier_test.py

# Run macroplanner test
uv run python macroplanner_test.py

# Run weekly plan builder
uv run python weeks_builder.py
```

### Frontend (React/Vite)
```bash
cd fe
npm install
npm run dev      # Start dev server
npm run build    # Build for production (runs tsc -b && vite build)
npm run lint     # Run ESLint
```

## Architecture

### LLM Agent Pipeline

The system uses a multi-stage LLM pipeline to generate training plans:

1. **Verifier** (`verifier.py`): Evaluates if a user's goal is realistic given their fitness level and timeline. Returns OK/WARNING/REJECTED with suggested changes.

2. **Macroplanner** (`macroplanner.py`): Generates high-level `TrainingStrategy` with periodized phases (Base → Build → Peak → Taper) and volume targets.

3. **Weeks Builder** (`weeks_builder.py`): Takes the macro strategy and generates detailed weekly schedules with specific running and strength sessions.

### Data Models

Located in `models/`:
- `inputs.py`: User-facing models (`UserProfile`, `BeginnerFitness`, `IntermediateFitness`, `RaceGoal`, `GeneralGoal`, `Logistics`)
- `outputs.py`: LLM output models (`ProfileEvaluation`, `WeeklySchedule`, `RunningSession`, `StrengthSession`)
- `enums.py`: Shared enums (`DayOfWeek`, `DistanceUnit`, `RiskValuation`)

### Shared Configuration

- `shared.py`: Contains the LLM model configuration (currently Google Gemini) and test profile data
- `model_utils.py`: Helper functions for formatting user profiles for LLM context

### Frontend

React + TypeScript + Vite + Tailwind CSS application in `fe/`. Currently contains a `UserProfileForm` component for collecting user data.

## Key Patterns

- All LLM agents use `pydantic-ai` with structured output types (Pydantic models)
- User profile validation includes timeline checks (race date must be after training start)
- The `UserProfile.needs_evaluation` property determines if verifier step is needed
- Recovery cycle calculation adapts based on age, injury history, and fitness level (3:1 or 2:1 cycles)
