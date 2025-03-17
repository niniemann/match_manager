import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export const fetchMaps = async () => {
    const { data } = await axios.get(`${API_ENDPOINT}/maps`);
    return data;
}
