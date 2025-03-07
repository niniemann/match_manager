"""
Provides an event system, allowing different components to listen to and emit events.
E.g., a `match.created` event could trigger a discord module to post a message, and notify browsers connected
to a websocket about the new match as well.

Note: In order to avoid import loops, data structures for events should be created together with and
      exclusively for the event type -- don't reuse e.g. the pydantic models used for validation of
      model api calls.
"""

from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from typing import Generic, TypeVar, Any

import asyncio

T = TypeVar("T")


class Event(Generic[T]):
    """
    A generic event wrapper that allows you to register asynchronous handlers
    that accept an event payload of type T.
    """
    def __init__(self, group: "EventGroup[T] | None" = None) -> None:
        self._handlers: list[Callable[[T], Coroutine[Any, Any, None]]] = []
        self.group: EventGroup[T] | None = group

    def add_handler(self, handler: Callable[[T], Coroutine[Any, Any, None]]) -> Callable[[T], Coroutine[Any, Any, None]]:
        """Register an asynchronous handler for this event."""
        self._handlers.append(handler)
        return handler

    async def emit(self, data: T) -> None:
        """
        Emit the event by running all its handlers concurrently.
        If the event belongs to an EventGroup, also run the groups global handlers.
        """
        tasks = [asyncio.create_task(handler(data)) for handler in self._handlers]
        if tasks:
            await asyncio.gather(*tasks)
        if self.group is not None:
            await self.group.emit_global(data)


class EventGroup(Generic[T]):
    """
    An event group that holds global listeners for all events in the group.
    Individual Event[T] objects created by the group will trigger these listeners
    when they are emitted.
    """
    def __init__(self) -> None:
        self._global_handlers: list[Callable[[T], Coroutine[Any, Any, None]]] = []

    def add_handler(self, handler: Callable[[T], Coroutine[Any, Any, None]]):
        """Register a global listener for all events in this group."""
        self._global_handlers.append(handler)

    async def emit_global(self, data: T) -> None:
        """Trigger all global listeners concurrently."""
        tasks = [asyncio.create_task(handler(data)) for handler in self._global_handlers]
        if tasks:
            await asyncio.gather(*tasks)

    def create_event(self) -> Event[T]:
        """Create a new Event[T] that is associated with this EventGroup."""
        return Event[T](self)



@dataclass
class TeamData:
    name: str

team = EventGroup[TeamData]()
team_created = team.create_event()
team_updated = team.create_event()
team_deleted = team.create_event()


@dataclass
class SeasonData:
    name: str

season = EventGroup[SeasonData]()
season_created = season.create_event()


@dataclass
class MatchGroupData:
    name: str

match_group = EventGroup[MatchGroupData]()
match_group_created = match_group.create_event()
match_group_updated = match_group.create_event()
match_group_deleted = match_group.create_event()


@dataclass
class AuditData:
    author_name: str
    author_id: str
    event_type: str
    event_description: str

audit_event = Event[AuditData]()
