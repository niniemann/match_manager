import discord_logo from "./img/discord-mark-blue.svg";
import { Button } from "@headlessui/react";

export default function LoginButton() {
  return (
    <Button className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md max-w-xs px-2 lg:px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
      <img className="h-6 lg:mr-2" src={discord_logo}></img>
      <span className="hidden lg:inline">Login with Discord</span>
    </Button>
  );
}
