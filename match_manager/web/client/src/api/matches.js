import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export const fetchMatches = async () => {
    const { data } = await axios.get(`${API_ENDPOINT}/maps`);
    return data;
}

export const fetchMatch = async (map_id) => {
    const { data } = await axios.get(`${API_ENDPOINT}/maps/${map_id}`);
    return data;
}
