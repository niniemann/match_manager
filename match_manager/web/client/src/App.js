import { Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

import "./App.css";
import Home from "./pages/Home.js";
import Teams from "./pages/Teams.js";
import Admin from "./pages/Admin.js";
import ecl_logo from "./img/ecl_logo_web.png";
import discord_logo from "./img/discord-mark-blue.svg";
import { SunIcon as SunIconSolid, MoonIcon as MoonIconSolid } from "@heroicons/react/24/solid";
import { SunIcon as SunIconOutline, MoonIcon as MoonIconOutline } from "@heroicons/react/24/outline";

import TopNavigation from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function App() {
  // configuration of a login-button within the TopNavigation
  const login_button = {
    type: "button",
    variant: "link",
    iconUrl: discord_logo,
    text: "login with discord",
    href: `${API_ENDPOINT}/../login`,
  };

  // configuration of a user-menu with a logout option within the TopNavigation,
  // requires extension with e.g. the users name and avatar
  const user_menu = {
    type: "menu-dropdown",
    items: [{ id: "logout", text: "logout", href: `${API_ENDPOINT}/../logout` }],
  };

  const [user_menu_or_login, set_user_menu_or_login] = useState({ ...login_button });
  const [is_admin_or_manager, set_is_admin_or_manager] = useState(false);

  // allow switching between dark- and light mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleMode = () => {
    setIsDarkMode(!isDarkMode);
    applyMode(isDarkMode ? Mode.Light : Mode.Dark);
    localStorage.setItem("mode", !isDarkMode ? "dark" : "light");
  };

  useEffect(() => {
    // check the users preference for dark/light mode from the local storage; default to dark mode
    const mode = localStorage.getItem("mode") || "dark";
    setIsDarkMode(mode === "dark");
    applyMode(mode === "dark" ? Mode.Dark : Mode.Light);

    // fetch info and permissions of the currently logged in user
    // and show either the menu to logout or the login-button, depending on the state,
    // and configure the app to show the admin pages if the user is either an admin
    // or team manager
    const fetchData = async () => {
      const user = await axios(`${API_ENDPOINT}/current-user`, { withCredentials: true });

      if (user.data.name) {
        set_user_menu_or_login({
          ...user_menu,
          text: user.data.name,
          iconUrl: user.data.avatar_url,
        });
      } else {
        set_user_menu_or_login(login_button);
      }

      set_is_admin_or_manager(user.data.is_admin || user.data.is_manager_for_teams.length > 0);
    };

    fetchData();
  }, []);

  // to use the react-dom-router together with cloudscape.design components,
  // we need to handle navigation manually
  const navigate = useNavigate();
  const handleNavigation = (event, href) => {
    event.preventDefault();
    navigate(href);
  };

  return (
    <div className="flex flex-col">
      {/* always show the main navigation on the top of the screen */}
      <div id="h" style={{ position: "sticky", top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{
            title: "European Community League",
            logo: {
              src: ecl_logo,
              alt: "ecl",
            },
            href: "/",
            onFollow: (event) => handleNavigation(event, "/"),
          }}
          utilities={[
            {
              type: "button",
              text: "Home",
              href: "/",
              onClick: (event) => handleNavigation(event, "/"),
            },
            {
              type: "button",
              text: "Teams",
              href: "/teams",
              onClick: (event) => handleNavigation(event, "/teams"),
            },
            ...(is_admin_or_manager
              ? [
                  {
                    type: "button",
                    text: "Admin",
                    href: "/admin",
                    onClick: (event) => handleNavigation(event, "/admin"),
                  },
                ]
              : []),
            user_menu_or_login,
            {
              type: "button",
              text: (
                <div className="flex items-center">
                  {isDarkMode ? <SunIconOutline className="flex-auto h-5 w-5" /> : <SunIconSolid className="h-5 w-5" />}
                  {isDarkMode ? (
                    <MoonIconSolid className="flex-auto h-4 w-4" />
                  ) : (
                    <MoonIconOutline className="h-4 w-4" />
                  )}
                </div>
              ),
              onClick: toggleMode,
            },
          ]}
        />
      </div>

      {/* include other pages, let the react router handle them on the client-side */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teams" element={<Teams />} />
        {is_admin_or_manager ? <Route path="/admin/*" element={<Admin />} /> : ""}
      </Routes>
    </div>
  );
}

export default App;
