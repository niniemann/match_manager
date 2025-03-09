import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppLayout, SideNavigation } from "@cloudscape-design/components";

import { TeamsTable } from "./admin/Teams.js";
import { SeasonsTable } from "./admin/Seasons.js";
import { SeasonEdit } from "./admin/SeasonEdit.js";
import { AuditLogTable } from "./admin/Audit.js";
import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;


export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [seasonLinkItems, setSeasonLinkTtems] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_ENDPOINT}/seasons`)
      .then(({ data }) => {
        const items = data.map((season) => {
          return { type: "link", text: season.name, href: `/admin/season/${season.id}` };
        });

        setSeasonLinkTtems(items);
      });

  }, []);

  return (
    <AppLayout
      headerSelector="#h"
      navigation=<SideNavigation
        activeHref={location.pathname}
        onFollow={(event) => {
          if (!event.detail.external) {
            event.preventDefault();
            navigate(event.detail.href);
          }
        }}
        items={[
          {
            type: "section-group",
            title: "Admin",
            items: [
              { type: "link", text: "Teams", href: "/admin/all-teams" },
              {
                type: "expandable-link-group", text: "Seasons", href: "/admin/seasons",
                items: seasonLinkItems
              },
              { type: "link", text: "Audit Log", href: "/admin/audit-log" },
            ],
          },
        ]}
      />
      content=<Routes>
        <Route path="all-teams" element={<TeamsTable />} />
        <Route path="seasons" element={<SeasonsTable />} />
        <Route path="season/:seasonId" element={<SeasonEdit />} />
        <Route path="audit-log" element={<AuditLogTable />} />
      </Routes>
    />
  );
}
