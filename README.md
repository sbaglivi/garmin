# Range

## Todo:
- write a small prompt versioning system?
- try validating a realistic user profile, see the output
- create an API
- create a fake login through only username for now, and json file db

## Learned lessons
- When acquisition of structured data can be done through an ad-hoc UI, it probably should be done so. 
  Wrangling agents into properly asking for information, dealing with an uncooperative user, and extracting it without hallucinating data is a lot of work. 
  It does open up new ways of interacting with users (e.g. creating a profile by email communication, or discord messages etc), which is why I initially thought of it, but it makes thing more complicated than they should be.
- In this version of the project, I defined nodes with very specific responsibilities (e.g. ask a question, extract new data, verify the user profile). I think it would be interesting to compare it to a version where you trust the LLM more, it gets a tool to update the user profile through a key-value dictionary or a similar interface, and see if the extra complexity of assigning specific roles improves performance or not.
- I don't love langgraph wrappers for LLM APIs. It might be necessary for the telemetry instrumentation, but I did not like dealing with classes like AIMessage, HumanMessage, etc. 
  I prefer having a simple, standard way of representing all messages (at least when they're pure text), whether that's just a dict (role, content) or a single class with the same properties.

  ## prompt versioning
  - pydantic models, would have to import them somehow. Maybe fake data generation, maybe not worth and out of scope
  - can switch model but keep the same prompt
  - can switch prompt without model
  - can regenerate
  - rate the prompt on multiple models, make adaptations, see if avg rating goes up
  - optionally write a function to validate output or use a model to rate the output?