import discord_logo from "./img/discord-mark-blue.svg";
import { Button } from "@headlessui/react";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export default function LoginButton() {
  return (
    <Button
      className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md max-w-xs px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      onClick={() => {
        window.location.href = `${API_ENDPOINT}/../login`;
      }}
    >
      <img className="h-4 lg:mr-2" src={discord_logo}></img>
      <span className="hidden lg:inline">Login with Discord</span>
    </Button>
  );
}
