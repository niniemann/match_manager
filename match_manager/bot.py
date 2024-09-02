"""discord-bot related functionalities"""

import logging
import discord

from . import config

logger = logging.getLogger(__name__)

class MatchManagerBot(discord.Bot):
    """Connects the MatchManager to the league/tournaments discord server"""
    def __init__(self, *args, **kwargs):
        intents = discord.Intents.default()
        intents.members = True  # request guild member information, for roles!

        super().__init__(*args, intents=intents, **kwargs)

        self._admin_guild: discord.Guild
        self._admin_role: discord.Role

    async def on_ready(self):
        """called after bot startup"""
        logger.info('discord bot connected')
        self._admin_guild = self.get_guild(config.discord.admin_guild_id)
        self._admin_role = self._admin_guild.get_role(config.discord.admin_role_id)

    async def is_match_manager_admin(self, user_id: int | str) -> bool:
        """
        Returns true if the user_id belongs to a tournament/league admin.
        This is associated with a pre-defined role in the discord server, configured in the
        config.toml of this application.
        """

        member = await self.get_admin_guild_member(user_id)
        is_admin = self._admin_role and member and self._admin_role in member.roles
        logger.debug((user_id, member and member.name, 'is admin?', is_admin))
        return is_admin

    async def get_admin_guild_member(self, user_id: int | str) -> discord.Member:
        """
        Returns a member object representing the user in the tournament discord server
        """
        return self._admin_guild.get_member(int(user_id)) or await self._admin_guild.fetch_member(int(user_id))

    def get_admin_guild(self) -> discord.Guild:
        """Access the admin guild object"""
        return self._admin_guild


_instance: MatchManagerBot | None = None

def get() -> MatchManagerBot:
    """accessor to a global MatchManagerBot instance"""
    global _instance  # pylint: disable=global-statement

    if _instance is None:
        _instance = MatchManagerBot()

    return _instance
