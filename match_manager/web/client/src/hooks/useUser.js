import { useQuery } from "react-query"
import { fetchCurrentUser } from "../api/user"

export const useCurrentUser = () => {
    return useQuery(["current-user"], fetchCurrentUser);
};
