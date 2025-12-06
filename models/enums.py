from enum import Enum

class RiskValuation(str, Enum):
    OK = "ok"
    WARNING = "warning"
    REJECTED = "rejected"

class DistanceUnit(str, Enum):
    KM = "kilometers"
    MILES = "miles"

class DayOfWeek(str, Enum):
    MON = "Monday"
    TUE = "Tuesday"
    WED = "Wednesday"
    THU = "Thursday"
    FRI = "Friday"
    SAT = "Saturday"
    SUN = "Sunday"

class ConfirmationStatus(str, Enum):
    YES = "yes"
    NO = "no"
    MAYBE = "maybe"
