import { KeyValuePairs } from "@cloudscape-design/components";
import { useTeam } from "../hooks/useTeams";
import { useMap } from "../hooks/useMaps";
import { DateTimeDisplay } from "./DateTime";
import { useEffect } from "react";

/// only basic info -- no results
/// created for preview during creation of matches!
export function MatchPreview({ match_data }) {
  const { data: team_a } = useTeam(match_data.team_a);
  const { data: team_b } = useTeam(match_data.team_b);
  const { data: map } = useMap(match_data.game_map);

  useEffect(() => {
    console.log({ team_a, team_b, map });
  });

  return (
    <>
      <KeyValuePairs
        columns={2}
        items={[
          {
            label: "Opponents",
            value: (
              <span>
                ({match_data.team_a_faction}) {team_a?.name} <br />
                ({match_data.team_a_faction ? (match_data.team_a_faction === "ALLIES" ? "AXIS" : "ALLIES") : ""}) {team_b?.name}
              </span>
            ),
          },
          {
            label: "Scheduled",
            value: (
              <>
                {match_data.match_time_state}
                <DateTimeDisplay timestamp={match_data.match_time} />
              </>
            ),
          },
          { label: "Map", value: <span>{map?.full_name}</span> },
        ]}
      />
    </>
  );
}
