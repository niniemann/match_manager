import { useMutation, useQuery, useQueryClient } from "react-query";
import { createMatch, fetchMatch, fetchMatches, fetchMatchesInGroup } from "../api/matches";

export const useMatches = () => {
  return useQuery(["matches"], fetchMatches);
};

export const useMatchesInGroup = (group_id) => {
  return useQuery(["matches", "in-group", group_id], () => fetchMatchesInGroup(group_id));
}

export const useMatch = (match_id) => {
  return useQuery(["match", match_id], () => fetchMatch(match_id), { enabled: !!match_id });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation((match_data) => {
    return createMatch(match_data);
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
    }
  });
}
