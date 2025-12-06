from typing import Annotated
from datetime import date, datetime
from pydantic import ValidationInfo, BeforeValidator

def parse_custom_date_format(v, info: ValidationInfo):
    if v is None: return None

    if isinstance(v, date):
        return v

    assert isinstance(v, str), f"expected {v} to be a string in {info.field_name}"

    # Try ISO format first (YYYY-MM-DD from HTML date inputs)
    if '-' in v and len(v) == 10:
        try:
            return datetime.strptime(v, '%Y-%m-%d').date()
        except ValueError:
            pass

    # Fall back to dd/mm/YYYY format
    return datetime.strptime(v, '%d/%m/%Y').date()

DateField = Annotated[date, BeforeValidator(parse_custom_date_format)]
