// construct a URL for a users avatar, using a fallback if no custom avatar is set
export function getDiscordAvatarUrl(user) {
  const base = "https://cdn.discordapp.com";
  const defaultAvatar = `${base}/embed/avatars/${(user["id"] >> 22) % 6}.png`;
  const avatar = "avatar" in user ? `${base}/avatars/${user["id"]}/${user["avatar"]}.png` : defaultAvatar;
  return avatar;
}
