import { useQuery } from "react-query";
import { fetchTeams } from "../api/teams";
import { fetchGroup } from "../api/groups";
import { useMemo } from "react";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;


export const useTeams = (group_id) => {
  let queryKey;
  let fetcher;

  if (group_id) {
    queryKey = ["group", group_id];
    fetcher = async () => {
      const group = await fetchGroup(group_id);
      return group.teams;
    };
  } else {
    queryKey = "teams";
    fetcher = () => fetchTeams();
  }

  return useQuery(queryKey, fetcher);
};

export const useTeamLookup = () => {
  const query = useTeams();
  const lookup = useMemo(
    () =>
      query.data?.reduce((prev, curr) => {
        // store in dictionary for lookup by id
        prev[curr.id] = {
          ...curr,
          // augment with logo_url
          logo_url: curr.logo_filename && `${API_ENDPOINT}/teams/logo/${curr.logo_filename}`,
        };
        return prev;
      }, {}) || {},
    [query.data]
  );

  return {
    ...query,
    data: lookup,
  };
};

export const useTeam = (team_id) => {
  const teamsQuery = useTeams(); // query all teams
  const team = useMemo(() => {
    return teamsQuery.data ? teamsQuery.data.find((t) => t.id === team_id) : undefined;
  }, [teamsQuery.data, team_id]);

  // return original query information (loading, error, ...),
  // just exchange the data for the filtered one
  return {
    ...teamsQuery,
    data: team,
  };
};
