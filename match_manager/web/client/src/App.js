import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

import "./App.css";
import Navbar from "./Navbar.js";
import Home from "./pages/Home.js";
import Teams from "./pages/Teams.js";
import Admin from "./pages/Admin.js";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function App() {
  const [discordUser, setDiscordUser] = useState(undefined);
  const [is_admin_or_manager, set_is_admin_or_manager] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = await axios(`${API_ENDPOINT}/current-user`, { withCredentials: true });
      const perm = await axios(`${API_ENDPOINT}/current-user/permissions`, { withCredentials: true });
      setDiscordUser(user.data);
      set_is_admin_or_manager(perm.data.is_admin || perm.data.is_manager_for_teams.length > 0);
      console.log(perm.data);
    };

    fetchData();
  }, []);

  return (
    <>
      <Navbar discordUser={discordUser} is_admin_or_manager={is_admin_or_manager} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teams" element={<Teams />} />
        {is_admin_or_manager ? <Route path="/admin" element={<Admin />} /> : ""}
      </Routes>
    </>
  );
}

export default App;
