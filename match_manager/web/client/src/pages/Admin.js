import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppLayout, SideNavigation } from "@cloudscape-design/components";

import { TeamsTable } from "./admin/Teams.js";
import { SeasonsTable } from "./admin/Seasons.js";
import { SeasonEdit } from "./admin/SeasonEdit.js";
import { AuditLogTable } from "./admin/Audit.js";
import axios from "axios";
import { MapTable } from "./admin/Maps.js";
import { SeasonMatches } from "./admin/SeasonMatches.js";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;


export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_ENDPOINT}/seasons`)
      .then(({ data }) => {
        setSeasons(data);
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
              /* Manage the available maps. No longer hardcoded, choose yourself which are relevant. */
              { type: "link", text: "Maps", href: "/admin/all-maps" },

              /* Manage all teams/coalitions that ever participated */
              { type: "link", text: "Teams", href: "/admin/all-teams" },

              /* Link to each seasons group/division management */
              {
                type: "expandable-link-group", text: "Seasons", href: "/admin/seasons",
                items: seasons.map((season) => ({ type: "link", text: season.name, href: `/admin/season/${season.id}` })
                )
              },

              /* The audit log -- check who messed up! */
              { type: "link", text: "Audit Log", href: "/admin/audit-log" },

              // For every season, add explicit management pages that would result in too deep of a clutter in the overall
              // season-nav. Stuff like match scheduling, penalties, the map-pool, ...
              ...seasons.map((season) => (
                {
                  type: "section",
                  text: season.name,
                  items: [
                    { type: "link", text: "Groups", href: `/admin/season/${season.id}` },
                    { type: "link", text: "Matches", href: `/admin/season/${season.id}/matches` }, /* TODO */
                  ]
                }
              ))
            ],
          },
          // TODO: Extra section/section-group for team managers, to handle match-scheduling, map-bans, ...
          {
            type: "section-group",
            title: "Team Manager",
            items: [
              {
                type: "section",
                text: "Dummy-Team",
                items: [
                  /* not sure how to separate views, yet -- maybe combine scheduling & map-bans into a single page per match? */
                  { type: "link", text: "Overview" },
                  { type: "link", text: "Scheduling" },
                  { type: "link", text: "Map-Bans" },
                  { type: "link", text: "Roaster" },
                ]
              }
            ]
          }
        ]}
      />
      content=<Routes>
        <Route path="all-maps" element={<MapTable />} />
        <Route path="all-teams" element={<TeamsTable />} />
        <Route path="seasons" element={<SeasonsTable />} />
        <Route path="season/:seasonId" element={<SeasonEdit />} />
        <Route path="season/:seasonId/matches" element={<SeasonMatches />} />
        <Route path="audit-log" element={<AuditLogTable />} />
      </Routes>
    />
  );
}
