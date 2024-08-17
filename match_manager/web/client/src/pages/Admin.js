import { Route, Routes } from "react-router-dom";

import SideMenu from "./admin/SideMenu.js";
import Teams from "./admin/Teams.js";

export default function Admin() {
  return (
    <div class="flex flex-1">
      <SideMenu />
      <Routes>
        <Route path="all-teams" element={<Teams />} />
        <Route path="audit-log" element={<></>} />
      </Routes>
    </div>
  );
}
