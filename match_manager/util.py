from collections.abc import Callable
from typing import Generic, Type, TypeVar
import inspect


T = TypeVar('T')

class ArgExtractor(Generic[T]):
    def __init__(self, function: Callable, arg_name: str, arg_type: Type[T] | None):
        """
        Creates an extractor object, which can be used to access the function parameter as specified
        by its name and type from given (*args, **kwargs) in a decorator.
        """
        sig = inspect.signature(function)

        for index, param in enumerate(sig.parameters.values()):
            if param.name == arg_name and (param.annotation == arg_type or (arg_type is None)):
                self._param = param
                self._index = index
                break
        else:
            raise ValueError(
                f'No argument "{arg_name}: {arg_type or ""}" in signature of function "{function.__name__}"'
            )

    def __call__(self, *args, **kwargs) -> T:
        match self._param.kind:
            case inspect.Parameter.POSITIONAL_ONLY:
                return args[self._index]
            case inspect.Parameter.KEYWORD_ONLY:
                return kwargs[self._param.name]
            case _:
                if self._param.name in kwargs:
                    return kwargs[self._param.name]
                return args[self._index]
