import { useMutation, useQuery, useQueryClient } from "react-query";
import { activateMatch, createMatch, draftMatch, fetchMatch, fetchMatches, fetchMatchesInGroup, fetchMatchesInPlanning, fetchMatchesWaitingForResult, removeMatch, resetResult, setResult, suggestMatchTime, updateMatch } from "../api/matches";

export const useMatches = () => {
  return useQuery(["matches"], fetchMatches);
};

export const useMatchesInGroup = (group_id) => {
  return useQuery(["matches", "in-group", group_id], () => fetchMatchesInGroup(group_id));
};

export const useMatchesInPlanning = () => {
  return useQuery(["matches", "in-planning"], () => fetchMatchesInPlanning());
};

export const useMatchesWaitingForResult = () => {
  return useQuery(["matches", "waiting-for-result"], () => fetchMatchesWaitingForResult());
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


export const useActivateMatch = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (match_id) => {
      return activateMatch(match_id);
    },
    {
      onSuccess: (data, match_id) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["match", match_id]);
      }
    }
  );
}

export const useDraftMatch = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (match_id) => {
      return draftMatch(match_id);
    },
    {
      onSuccess: (data, match_id) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["match", match_id]);
      }
    }
  );
}

export const useSetMatchResult = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({match_id, winner_id, result}) => {
      return setResult({match_id, winner_id, result});
    },
    {
      onSuccess: (data, {match_id, winner_id, result}) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["match", match_id]);
      }
    }
  );
}

export const useResetMatchResult = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (match_id) => {
      return resetResult(match_id);
    },
    {
      onSuccess: (data, match_id) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["match", match_id]);
      }
    }
  );
}

export const useSuggestMatchTime = () => {
  const queryClient = useQueryClient();
  return useMutation(suggestMatchTime,
    {
      onSuccess: (data, {match_id, suggesting_team, match_time}) => {
        queryClient.invalidateQueries(["matches"]);
        queryClient.invalidateQueries(["matche", match_id]);
      }
    }
  )
}
