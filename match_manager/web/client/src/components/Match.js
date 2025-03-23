import { Button, Form, FormField, KeyValuePairs, Select, SpaceBetween } from "@cloudscape-design/components";
import { useTeam } from "../hooks/useTeams";
import { useMap } from "../hooks/useMaps";
import { DateTimeDisplay } from "./DateTime";
import { useEffect, useState } from "react";
import { useMatch } from "../hooks/useMatches";
import { LoadingBar } from "@cloudscape-design/chat-components";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

/// only basic info -- no results
/// created for preview during creation of matches!
export function MatchPreview({ match_data }) {
  const { data: team_a } = useTeam(match_data.team_a);
  const { data: team_b } = useTeam(match_data.team_b);
  const { data: map } = useMap(match_data.game_map);

  useEffect(() => {
    console.log({ team_a, team_b, map });
  });

  return (
    <>
      <KeyValuePairs
        columns={2}
        items={[
          {
            label: "Opponents",
            value: (
              <span>
                ({match_data.team_a_faction}) {team_a?.name} <br />(
                {match_data.team_a_faction ? (match_data.team_a_faction === "ALLIES" ? "AXIS" : "ALLIES") : ""}){" "}
                {team_b?.name}
              </span>
            ),
          },
          {
            label: "Scheduled",
            value: (
              <>
                {match_data.match_time_state}
                <DateTimeDisplay timestamp={match_data.match_time} />
              </>
            ),
          },
          { label: "Map", value: <span>{map?.full_name}</span> },
        ]}
      />
    </>
  );
}

export function MatchResultSubmitForm({ match_id, onClose, onSubmit }) {
  const { data: match, isLoading: match_loading } = useMatch(match_id);
  const { data: team_a, isLoading: team_a_loading } = useTeam(match?.team_a);
  const { data: team_b, isLoading: team_b_loading } = useTeam(match?.team_b);

  const loading = match_loading || team_a_loading || team_b_loading;

  const [winnerId, setWinnerId] = useState(undefined);
  const [capScore, setCapScore] = useState(undefined);

  useEffect(() => {
    setWinnerId(match?.winner);
    setCapScore(match?.winner_caps);
  }, [match, setWinnerId, setCapScore]);

  if (loading) {
    return <LoadingBar />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      winner_id: winnerId,
      result: capScore,
    });
  };

  const option_team_a = {
    label: team_a.name,
    value: team_a.id,
    iconUrl: `${API_ENDPOINT}/teams/logo/${team_a.logo_filename}`,
  };
  const option_team_b = {
    label: team_b.name,
    value: team_b.id,
    iconUrl: `${API_ENDPOINT}/teams/logo/${team_b.logo_filename}`,
  };

  const result_options = [
    { label: "5-0", value: 5 },
    { label: "4-1", value: 4 },
    { label: "3-2", value: 3 },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!winnerId || !capScore}>
              Save
            </Button>
          </SpaceBetween>
        }
      >
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "Winner",
              value: (
                <Select
                  selectedOption={winnerId && (winnerId == team_a.id ? option_team_a : option_team_b)}
                  options={[option_team_a, option_team_b]}
                  triggerVariant="option"
                  onChange={({ detail }) => {
                    setWinnerId(detail.selectedOption.value);
                  }}
                />
              ),
            },
            {
              label: "Result",
              value: (
                <Select
                  selectedOption={result_options.find((o) => o.value === capScore)}
                  options={result_options}
                  onChange={({ detail }) => {
                    setCapScore(detail.selectedOption.value);
                  }}
                />
              ),
            },
          ]}
        />
        {/*
        <FormField label="Winner">
          <Select
            selectedOption={winnerId && (winnerId == team_a.id ? option_team_a : option_team_b)}
            options={[option_team_a, option_team_b]}
            triggerVariant="option"
            onChange={({ detail }) => {
              setWinnerId(detail.selectedOption.value);
            }}
          />
        </FormField>
        <FormField label="Result">
          <Select
            selectedOption={result_options.find((o) => o.value === capScore)}
            options={result_options}
            onChange={({ detail }) => {
              setCapScore(detail.selectedOption.value);
            }}
          />
        </FormField>
         */}
      </Form>
    </form>
  );
}
