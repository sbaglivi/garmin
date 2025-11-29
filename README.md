# Range

## Todo:
- we need manual validation on structured output from LLMs, sometimes the output does not fit the criteria and we should retry while pointing out the missing / incorrect fields to the model

## Learned lessons
- When acquisition of structured data can be done through an ad-hoc UI, it probably should be done so. 
  Wrangling agents into properly asking for information, dealing with an uncooperative user, and extracting it without hallucinating data is a lot of work. 
  It does open up new ways of interacting with users (e.g. creating a profile by email communication, or discord messages etc), which is why I initially thought of it, but it makes thing more complicated than they should be.
- I don't love langgraph wrappers for LLM APIs. It might be necessary for the telemetry instrumentation, but I did not like dealing with classes like AIMessage, HumanMessage, etc. 
  I prefer having a simple, standard way of representing all messages (at least when they're pure text), whether that's just a dict (role, content) or a single class with the same properties.