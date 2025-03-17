import { useQuery } from "react-query";
import { fetchTeams } from "../api/teams";
import { fetchGroup } from "../api/groups";
import { useMemo } from "react";

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
