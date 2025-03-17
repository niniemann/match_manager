import { useQuery } from "react-query";
import { fetchTeams } from "../api/teams";
import { fetchGroup } from "../api/groups";

export const useTeams = (group_id) => {
    let queryKey;
    let fetcher;

    if (group_id) {
        queryKey = ['group', group_id];
        fetcher = async () => {
            const group = await fetchGroup(group_id);
            return group.teams;
        };
    } else {
        queryKey = 'teams';
        fetcher = () => fetchTeams();
    }

    return useQuery(queryKey, fetcher);
}
