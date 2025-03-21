import { useMutation, useQuery, useQueryClient } from "react-query";
import { createMatch, fetchMatch, fetchMatches, fetchMatchesInGroup, removeMatch, updateMatch } from "../api/matches";

export const useMatches = () => {
  return useQuery(["matches"], fetchMatches);
};

export const useMatchesInGroup = (group_id) => {
  return useQuery(["matches", "in-group", group_id], () => fetchMatchesInGroup(group_id));
};

export const useMatch = (match_id) => {
  return useQuery(["match", match_id], () => fetchMatch(match_id), { enabled: !!match_id });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (match_data) => {
      return createMatch(match_data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matches"]);
      },
    }
  );
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ match_id, match_data }) => {
      return updateMatch(match_id, match_data);
    },
    {
      onSuccess: (data, { match_id, match_data }) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["match", match_id]);
      },
    }
  );
};

export const useRemoveMatch = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (match_id) => {
      return removeMatch(match_id);
    },
    {
      onSuccess: (data, match_id) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["match", match_id]);
      },
    }
  );
};
