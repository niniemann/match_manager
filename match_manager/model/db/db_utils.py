import enum
import peewee as pw

from typing import Generic, TypeVar

T = TypeVar('T', bound=enum.Enum)

class EnumField(pw.CharField, Generic[T]):
    """
    Database field for any enum.Enum type T.
    Enum entries are stored as their names, e.g. ('WIN_5_0', 5) -> 'WIN_5_0'.
    """
    def __init__(self, enum_type: type[T], *args, **kwargs) -> None:
        # init the CharField parent class
        super().__init__(*args, **kwargs)

        # store the type of the enum, to reconstruct later
        self._type = enum_type

    def db_value(self, value: T | None) -> None | str:
        return value and value.name

    def python_value(self, value: str | None) -> None | T:
        if value is None:
            return None
        return self._type[super().python_value(value)]


class AutoNameEnum(enum.Enum):
    """
    Lets 'auto()' set the value equal to the name of an enum entry.
    Useful when values are transmitted to e.g. a web application.
    """
    @staticmethod
    def _generate_next_value_(name, start, count, last_values) -> str:
        return name
