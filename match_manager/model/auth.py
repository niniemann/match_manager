from functools import wraps
from typing import Optional

from pydantic import BaseModel, validate_call

from match_manager import bot
from match_manager.util import ArgExtractor
from .db.team import TeamManager, Team

class User(BaseModel):
    """A user-object: A name, id, and permissions"""
    id: str    # discord user id
    name: str  # discord user name
    is_admin: bool  # whether full admin rights are granted
    is_manager_for_teams: list[int]   # which teams the user is allowed to manage
    avatar_url: Optional[str] = None  # url to the discord avatar

    def is_manager_for(self, team: Team | int) -> bool:
        """True if the user is team manager for the given team"""
        tid = team.id if isinstance(team, Team) else team
        return tid in self.is_manager_for_teams


EmptyUser = User(id="", name="", is_admin=False, is_manager_for_teams=[])

@validate_call
async def get_user_info(user_id: str) -> User:
    """Collect information about the user with the given id"""

    is_admin = await bot.get().is_match_manager_admin(user_id)
    teams = [manager.team_id for manager in TeamManager.select().where(TeamManager.discord_user_id==user_id)]

    member = await bot.get().get_admin_guild_member(user_id)
    name = "unknown" if member is None else member.display_name
    avatar_url = None if member is None else member.display_avatar.with_size(128).url

    return User(
        id=user_id,
        name=name,
        is_admin=is_admin,
        is_manager_for_teams=teams,
        avatar_url=avatar_url,
    )


class PermissionDenied(Exception):
    pass


def requires_admin(user_arg_name: str = 'author'):
    """
    Decorator to mark model functions that are only accessible to admins (not team managers).
    This requires that the function is passed a auth.User object as the argument with the
    name specified as 'user_arg_name'. It is that object which is inspected for the admin rights.
    """
    def _requires_admin(f):
        get_user = ArgExtractor(function=f, arg_name=user_arg_name, arg_type=User)

        @wraps(f)
        async def __requires_admin(*args, **kwargs):
            user = get_user(*args, **kwargs)
            if not user.is_admin:
                raise PermissionDenied(f'You require admin rights to execute {f.__name__}.')
            return await f(*args, **kwargs)

        return __requires_admin
    return _requires_admin


def requires_team_manager(user_arg_name: str = 'author'):
    """
    Decorator to mark model functions that are only accessible to team managers.
    Similar to `requires_admin`, but less restrictive: This only checks **if** the user is **a**
    team manager, but not if for the team that is being acted on. Check that separately!
    """
    def _requires_team_manager(f):
        get_user = ArgExtractor(function=f, arg_name=user_arg_name, arg_type=User)

        @wraps(f)
        async def __requires_team_manager(*args, **kwargs):
            user = get_user(*args, **kwargs)
            if len(user.is_manager_for_teams) == 0:
                raise PermissionDenied(f'You must be a team manager to execute {f.__name__}.')
            return await f(*args, **kwargs)

        return __requires_team_manager
    return _requires_team_manager
