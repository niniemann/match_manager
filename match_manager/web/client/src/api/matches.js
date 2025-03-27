import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export const fetchMatches = async () => {
  const { data } = await axios.get(`${API_ENDPOINT}/matches`);
  return data;
};

export const fetchMatchesInGroup = async (group_id) => {
  const { data } = await axios.get(`${API_ENDPOINT}/seasons/groups/${group_id}/matches`);
  return data;
};

export const fetchMatchesInPlanning = async () => {
  const { data } = await axios.get(`${API_ENDPOINT}/matches/in-planning`);
  return data;
};

export const fetchMatchesWaitingForResult = async () => {
  const { data } = await axios.get(`${API_ENDPOINT}/matches/waiting-for-result`);
  return data;
};

export const fetchMatch = async (match_id) => {
  const { data } = await axios.get(`${API_ENDPOINT}/matches/${match_id}`);
  return data;
};

// TODO: explicit arguments?
export const createMatch = async (match_data) => {
  const { data } = await axios.post(`${API_ENDPOINT}/matches/`, { ...match_data }, { withCredentials: true });
  return data;
};

export const updateMatch = async (match_id, match_data) => {
  const { data } = await axios.patch(`${API_ENDPOINT}/matches/${match_id}`, match_data, { withCredentials: true });
  return data;
};

export const removeMatch = async (match_id) => {
  await axios.delete(`${API_ENDPOINT}/matches/${match_id}`, { withCredentials: true });
};

export const activateMatch = async (match_id) => {
  const { data } = await axios.post(`${API_ENDPOINT}/matches/${match_id}/set_active`, "", { withCredentials: true });
  return data;
};

export const draftMatch = async (match_id) => {
  const { data } = await axios.post(`${API_ENDPOINT}/matches/${match_id}/set_draft`, "", { withCredentials: true });
  return data;
};

export const setResult = async ({ match_id, winner_id, result }) => {
  const { data } = await axios.post(
    `${API_ENDPOINT}/matches/${match_id}/set_result`,
    { winner_id, result },
    { withCredentials: true }
  );
  return data;
};

export const resetResult = async (match_id) => {
  const { data } = await axios.post(`${API_ENDPOINT}/matches/${match_id}/reset_result`, "", { withCredentials: true });
  return data;
};

export const suggestMatchTime = async ({ match_id, suggesting_team, match_time }) => {
  const { data } = await axios.post(
    `${API_ENDPOINT}/matches/${match_id}/suggest_match_time`,
    { match_time, suggesting_team },
    { withCredentials: true }
  );
  return data;
};
