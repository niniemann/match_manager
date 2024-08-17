import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { NavLink } from "react-router-dom";

import LoginButton from "./LoginButton.js";
import ecl_logo from "./img/ecl_logo_web.png";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

const navigation = [
  { name: "Home", href: "/" },
  { name: "Teams", href: "/teams" },
  { name: "Rules", href: "/rules" },
  { name: "User Scoreboard", href: "#" },
  { name: "Division Rankings", href: "#" },
  { name: "Match History", href: "#" },
];

function UserMenu({ user }) {
  const base = "https://cdn.discordapp.com";
  const defaultAvatar = `${base}/embed/avatars/${(user["id"] >> 22) % 6}.png`;
  const avatar = "avatar" in user ? `${base}/avatars/${user["id"]}/${user["avatar"]}.png` : defaultAvatar;
  const username = "global_name" in user ? user["global_name"] : user["username"];

  return (
    <>
      <Menu as="div">
        <MenuButton className="relative px-1 py-1 flex rounded-full bg-gray-800 text-sm ring-2 ring-gray-500 hover:ring-white">
          <div className="flex items-center">
            <img alt="" src={avatar} className="h-10" />
            <span className="hidden md:inline mx-2 text-sm text-white font-medium">{username}</span>
          </div>
        </MenuButton>
        <MenuItems
          transition
          className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
        >
          <MenuItem>
            <a
              href={`${API_ENDPOINT}/../logout`}
              className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
            >
              logout
            </a>
          </MenuItem>
        </MenuItems>
      </Menu>
    </>
  );
}

export function CustomNavItem({ name, href }) {
  return (
    <NavLink
      key={name}
      to={href}
      className={({ isActive, isPending, isTransitioning }) =>
        [
          isActive ? "bg-gray-900 text-white" : "text-gray-300",
          "hover:bg-gray-700 hover:text-white",
          "rounded-md px-3 py-2 text-sm font-medium",
        ].join(" ")
      }
    >
      {name}
    </NavLink>
  );
}

export function Navbar({ discordUser, is_admin_or_manager }) {
  return (
    <Disclosure as="nav" className="bg-gray-800 w-full top-0 z-10">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
            {/* Mobile menu button*/}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="block h-6 w-6 group-data-[open]:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden h-6 w-6 group-data-[open]:block" />
            </DisclosureButton>
          </div>
          <div className="flex flex-1 items-center justify-center md:items-stretch md:justify-start">
            <div className="flex flex-shrink-0 items-center">
              <img alt="ECL" src={ecl_logo} className="h-16 w-auto" />
            </div>
            <div className="hidden md:ml-6 md:block items-center">
              <div className="flex h-full items-center justify-center space-x-2">
                {navigation.map((item) => (
                  <CustomNavItem name={item.name} href={item.href} />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 md:static md:inset-auto md:ml-6 md:pr-0">
            {/* if admin or team manager, show the admin-link */}
            {is_admin_or_manager ? (
              <CustomNavItem name="Admin" href="/admin" />
            ) : (
              ""
            )}
            {/* if not logged in, show the login button, else the user profile picture */}
            {discordUser === undefined ? (
              ""
            ) : "username" in discordUser ? (
              <UserMenu user={discordUser} />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>

      <DisclosurePanel className="md:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={[
                item.current ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white",
                "block rounded-md px-3 py-2 text-base font-medium",
              ].join(" ")}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
