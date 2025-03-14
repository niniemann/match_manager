/// admin management of matches in a given season

import { Table } from "@cloudscape-design/components";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DateTimeDisplay } from "../../components/DateTime";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;


export function SeasonMatches() {
  const { seasonId } = useParams();
  const [season, setSeason] = useState({});             // info about the selected season
  const [teamLookup, setTeamLookup] = useState({});     // lookup for team-id -> team-info
  const [groupLookup, setGroupLookup] = useState({});   // lookup of group-id -> group-info of groups within the season
  const [matches, setMatches] = useState([]);           // table rows


  useEffect(() => {
    const init = async () => {
        // gather season- and group-info
        const { data: seasonData } = await axios.get(`${API_ENDPOINT}/seasons/${seasonId}`);
        console.log(seasonData);
        setSeason(seasonData);

        let lookup = seasonData.match_groups.reduce((acc, group) => { acc[group.id] = group; return acc; }, {});
        setGroupLookup(lookup);

        // gather team info (there might be matches of teams no longer in the season -- theoretically.)
        const { data: teamData } = await axios.get(`${API_ENDPOINT}/teams`);
        lookup = teamData.reduce((acc, team) => { acc[team.id] = team; return acc; }, {});
        setTeamLookup(lookup);

        // gather match data
        const { data: matchData } = await axios.get(`${API_ENDPOINT}/seasons/${seasonId}/matches`);
        setMatches(matchData);
    };

    init();
  }, [seasonId]);




  const columns = [
    { id: 'match_id', header: 'Id', cell: (match) => match.id },
    { id: 'group', header: 'Group', cell: (match) => groupLookup[match.group]?.name },
    { id: 'team_a', header: '', cell: (match) => teamLookup[match.team_a]?.name },
    { id: 'vs', header: '', cell: (cell) => 'vs' },
    { id: 'team_b', header: '', cell: (match) => teamLookup[match.team_b]?.name },
    { id: 'match_time', header: 'Date/Time', cell: (match) => match.match_time && <DateTimeDisplay timestamp={match.match_time} /> },
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
