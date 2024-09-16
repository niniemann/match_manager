import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { AppLayout, SideNavigation } from "@cloudscape-design/components";

import { TeamsTable } from "./admin/Teams.js";
import { SeasonsTable } from "./admin/Seasons.js";
import { SeasonEdit } from "./admin/SeasonEdit.js";

export default function Admin() {
  const navigate = useNavigate();

  const [activeHref, setActiveHref] = useState("");

  return (
    <AppLayout
      headerSelector="#h"
      navigation=<SideNavigation
        activeHref={activeHref}
        onFollow={(event) => {
          if (!event.detail.external) {
            event.preventDefault();
            setActiveHref(event.detail.href);
            navigate(event.detail.href);
          }
        }}
        items={[
          {
            type: "section-group",
            title: "Admin",
            items: [
              { type: "link", text: "Teams", href: "all-teams" },
              { type: "link", text: "Seasons", href: "seasons" },
              { type: "link", text: "Audit Log", href: "audit-log" },
            ],
          },
        ]}
      />
      content=<Routes>
        <Route path="all-teams" element={<TeamsTable />} />
        <Route path="seasons" element={<SeasonsTable />} />
        <Route path="season/:seasonId" element={<SeasonEdit />} />
        <Route path="audit-log" element={<></>} />
      </Routes>
    />
  );
}
