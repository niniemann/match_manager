import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export const fetchMatches = async () => {
    const { data } = await axios.get(`${API_ENDPOINT}/matches`);
    return data;
}

export const fetchMatchesInGroup = async (group_id) => {
    const { data } = await axios.get(`${API_ENDPOINT}/seasons/groups/${group_id}/matches`);
    return data;
}

export const fetchMatch = async (match_id) => {
    const { data } = await axios.get(`${API_ENDPOINT}/matches/${match_id}`);
    return data;
}

// TODO: explicit arguments?
export const createMatch = async (match_data) => {
    const { data } = await axios.post(`${API_ENDPOINT}/matches/`, { ...match_data }, { withCredentials: true });
    return data;
}

export const removeMatch = async (match_id) => {
    await axios.delete(`${API_ENDPOINT}/matches/${match_id}`, { withCredentials: true });
}
