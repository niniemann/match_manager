import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export const fetchGroup = async (group_id) => {
  const { data } = await axios.get(`${API_ENDPOINT}/seasons/groups/${group_id}`);
  return data;
};
