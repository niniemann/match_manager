from typing import Literal
from functools import wraps

import string
import logging

from match_manager.util import ArgExtractor

from .db.audit_event import AuditEvent
from . import auth, db

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_audit_entry(author: auth.User, event_type: str, event_description: str) -> None:
    """Create a new audit log entry for an action of an authenticated user."""

    logger.info((author.id, author.name, event_type, event_description))

    with db.proxy.atomic() as txn:
        e = AuditEvent(
            author=author.id,
            event_type=event_type,
            event_description=event_description
        )
        e.save()


def log_call(
        description: str = "",
        when: Literal["always", "on_success"] = "on_success",
        event_type: str | None = None,
        user_arg_name: str = "author"
        ):
    """
    Decorator to log function calls in the audit log.
    Supports only async functions.

    Requires the function to take an auth.User object by a parameter whichs name can be specified in "user_arg_name".
    The description supports formatting arguments, which will be looked up in the function parameters.
    If no event_type is given, the name of the wrapped function is used.
    """

    # inspect the description to find tokens to replace by function arguments
    formatter = string.Formatter()
    tokens = [ field_name.split('.')[0] for _, field_name, _, _ in formatter.parse(description) if field_name ]

    def _audit_log(f):
        get_user = ArgExtractor(function=f, arg_name=user_arg_name, arg_type=auth.User)

        # get access to all required parameters of f for the description string
        extractors = {
            token: ArgExtractor(f, arg_name=token, arg_type=None)  # don't care about the argument type
            for token in tokens
        }

        @wraps(f)
        async def __audit_log(*args, **kwargs):
            # extract the actual values as required for the logging
            values = { key: ext(*args, **kwargs) for key, ext in extractors.items() }

            do_log = True
            try:
                return await f(*args, **kwargs)
            except:
                do_log = False or when == 'always'
                raise
            finally:
                if do_log:
                    create_audit_entry(
                        author=get_user(*args, **kwargs),
                        event_type=event_type or f"{f.__module__}.{f.__name__}",
                        event_description=description.format(**values)
                    )

        return __audit_log
    return _audit_log



# Example usage:
#
# @log_call(description="by {author.name}, baz = {baz}, bar = {bar}")
# def foooo(author: auth.User, bar: str, baz: int):
#     print('foooo!', bar, baz)
#     if baz != 42:
#         raise Exception("wooops!")
