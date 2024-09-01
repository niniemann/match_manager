"""model functions regarding _any_ user on the tournament discord"""

from itertools import islice
from typing import Self
from pydantic import BaseModel, validate_call
import discord

from match_manager import bot

class DiscordMemberInfo(BaseModel):
    """basic info about any member on the discord"""
    id: int    # discord user id
    name: str  # discord user name
    avatar_url: str   # url to the users avatar
    roles: list[str]  # names of roles the user has on the discord

    @staticmethod
    def from_discord(member: discord.Member) -> Self:
        """convert a discord member to a DiscordMemberInfo model"""
        return DiscordMemberInfo(
            id=member.id,
            name=member.display_name,
            avatar_url=member.display_avatar.with_size(64).url,
            roles=[str(r) for r in member.roles if str(r) != "@everyone"]
        )


@validate_call
async def search_user(search: str, max_results: int = 10) -> list[DiscordMemberInfo]:
    """searches for discord members, and returns a list of results"""
    guild = bot.get().get_admin_guild()
    return [DiscordMemberInfo.from_discord(m) for m in await guild.search_members(search, limit=max_results)]


@validate_call
async def get_user(user_id: int) -> DiscordMemberInfo | None:
    """returns information for a selected user id"""
    member = await bot.get().get_admin_guild_member(user_id)
    return member and DiscordMemberInfo.from_discord(member)
