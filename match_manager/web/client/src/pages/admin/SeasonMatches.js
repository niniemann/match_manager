/// admin management of matches in a given season

import { Popover, StatusIndicator, Table } from "@cloudscape-design/components";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DateTimeDisplay } from "../../components/DateTime";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export function SeasonMatches() {
  const { seasonId } = useParams();
  const [season, setSeason] = useState({}); // info about the selected season
  const [teamLookup, setTeamLookup] = useState({}); // lookup for team-id -> team-info
  const [groupLookup, setGroupLookup] = useState({}); // lookup of group-id -> group-info of groups within the season
  const [matches, setMatches] = useState([]); // table rows

  useEffect(() => {
    const init = async () => {
      // gather season- and group-info
      const { data: seasonData } = await axios.get(`${API_ENDPOINT}/seasons/${seasonId}`);
      console.log(seasonData);
      setSeason(seasonData);

      let lookup = seasonData.match_groups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
      }, {});
      setGroupLookup(lookup);

      // gather team info (there might be matches of teams no longer in the season -- theoretically.)
      const { data: teamData } = await axios.get(`${API_ENDPOINT}/teams`);
      lookup = teamData.reduce((acc, team) => {
        acc[team.id] = team;
        return acc;
      }, {});
      setTeamLookup(lookup);

      // gather match data
      const { data: matchData } = await axios.get(`${API_ENDPOINT}/seasons/${seasonId}/matches`);
      setMatches(matchData);
    };

    init();
  }, [seasonId]);

  const getStateIndicator = (match) => {
    switch (match.state) {
      case "DRAFT":
        return <StatusIndicator type="stopped">Draft</StatusIndicator>;
      case "PLANNING":
        return <StatusIndicator type="in-progress">In planning</StatusIndicator>;
      case "ACTIVE":
        return <StatusIndicator type="pending">Waiting for result</StatusIndicator>;
      case "COMPLETED":
        return <StatusIndicator type="success">Done</StatusIndicator>;
      case "CANCELLED":
        return <StatusIndicator type="error">Cancelled</StatusIndicator>;
      default:
        return <StatusIndicator type="warning">Unknown</StatusIndicator>;
    }
  };

  const waitingForConfirm = (team_id, match_time) => {
    const tooltip = `Waiting for ${teamLookup[team_id]?.name} to confirm.`;
    return (
      <Popover content={tooltip} dismissButton={false}>
        <StatusIndicator type="in-progress">
          <DateTimeDisplay timestamp={match_time} />
        </StatusIndicator>
      </Popover>
    );
  };

  const getScheduleIndicator = (match) => {
    switch (match.match_time_state) {
      case "FIXED":
        return match.match_time && <DateTimeDisplay timestamp={match.match_time} />;
      case "OPEN_FOR_SUGGESTIONS":
        return <StatusIndicator type="pending">Waiting for suggestions</StatusIndicator>;
      case "A_CONFIRMED":
        return waitingForConfirm(match.team_b, match.match_time);
      case "B_CONFIRMED":
        return waitingForConfirm(match.team_a, match.match_time);
      case "BOTH_CONFIRMED":
        return <StatusIndicator type="success"><DateTimeDisplay timestamp={match.match_time} /></StatusIndicator>;
      default:
        return <StatusIndicator type="error">Unknown</StatusIndicator>;
    }
  };

  const columns = [
    { id: "match_id", header: "Id", cell: (match) => match.id },
    { id: "group", header: "Group", cell: (match) => groupLookup[match.group]?.name },
    { id: "match_time", header: "Date/Time", cell: getScheduleIndicator },
    { id: "team_a", header: "Team A", cell: (match) => teamLookup[match.team_a]?.name },
    { id: "team_b", header: "Team B", cell: (match) => teamLookup[match.team_b]?.name },
    { id: "state", header: "State", cell: getStateIndicator },
  ];

  return (
    <>
      <Table
        columnDefinitions={columns}
        items={matches}
        trackBy="id"
        empty={<p>Nothing to see here.</p>}
        variant="full-page"
      />
    </>
  );
}
