import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppLayout, SideNavigation } from "@cloudscape-design/components";

import { TeamsTable } from "./admin/Teams.js";
import { SeasonsTable } from "./admin/Seasons.js";
import { SeasonEdit } from "./admin/SeasonEdit.js";
import { AuditLogTable } from "./admin/Audit.js";
import axios from "axios";
import { MapTable } from "./admin/Maps.js";
import { MatchGroupEdit } from "./admin/MatchGroupEdit.js";
import { useCurrentUser } from "../hooks/useUser.js";
import { TeamManagerOpenTasks } from "./manager/OpenTasks.js";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentUser } = useCurrentUser();

  console.log(currentUser);

  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    axios.get(`${API_ENDPOINT}/seasons`).then(({ data }) => {
      setSeasons(data);
    });
  }, []);

  const admin_nav = {
    type: "section-group",
    title: "Admin",
    items: [
      /* Manage the available maps. No longer hardcoded, choose yourself which are relevant. */
      { type: "link", text: "Maps", href: "/admin/all-maps" },

      /* Manage all teams/coalitions that ever participated */
      { type: "link", text: "Teams", href: "/admin/all-teams" },

      /* Link to seasons management.. i.e., create seasons.*/
      { type: "link", text: "Seasons", href: "/admin/seasons" },

      /* The audit log -- check who messed up! */
      { type: "link", text: "Audit Log", href: "/admin/audit-log" },

      { type: "divider" },

      {
        type: "section-group",
        title: "Seasons",
        // For every season, add explicit management pages that would result in too deep of a clutter in the overall
        // season-nav. Stuff like match scheduling, penalties, the map-pool, ...
        items: seasons.map((season) => ({
          type: "expandable-link-group",
          text: season.name,
          href: `/admin/season/${season.id}`,
          items: [
            { type: "link", text: "Teams", href: `/admin/season/${season.id}` },

            ...season.match_groups.map((group) => ({
              type: "link",
              text: group.name,
              href: `/admin/season/${season.id}/group/${group.id}/matches`,
            })),
          ],
        })),
      },
    ],
  };

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
          ...((currentUser?.is_admin && [admin_nav, { type: "divider" }]) || []),

          // Extra section/section-group for team managers, to handle match-scheduling, map-bans, ...
          {
            type: "section-group",
            title: "Team Manager",
            items: currentUser?.is_manager_for_teams.map((team_id) => ({
              type: "section",
              text: `Team: ${team_id}`,
              items: [{ type: "link", text: "Tasks", href: `/admin/manage-team/${team_id}/tasks` }],
            })) ?? [],
          },
        ]}
      />
      content=<Routes>
        <Route path="all-maps" element={<MapTable />} />
        <Route path="all-teams" element={<TeamsTable />} />
        <Route path="seasons" element={<SeasonsTable />} />
        <Route path="season/:seasonId" element={<SeasonEdit />} />
        <Route path="season/:seasonId/group/:groupId/matches" element={<MatchGroupEdit />} />
        <Route path="audit-log" element={<AuditLogTable />} />
        <Route path="manage-team/:teamId/tasks" element={<TeamManagerOpenTasks />} />
      </Routes>
    />
  );
}
