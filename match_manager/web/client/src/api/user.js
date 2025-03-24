import axios from "axios"

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export const fetchCurrentUser = async () => {
    const { data } = await axios.get(`${API_ENDPOINT}/current-user`, { withCredentials: true });
    return data;
}
