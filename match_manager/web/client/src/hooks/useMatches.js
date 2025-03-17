import { useQuery } from "react-query";
import { fetchMatch, fetchMatches } from "../api/matches";

export const useMatches = () => {
  return useQuery("matches", fetchMatches);
};

export const useMatch = (match_id) => {
  return useQuery(["match", match_id], () => fetchMatch(match_id), { enabled: !!match_id });
};
