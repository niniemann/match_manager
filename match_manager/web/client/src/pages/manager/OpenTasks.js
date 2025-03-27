import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  DatePicker,
  Header,
  KeyValuePairs,
  Modal,
  SpaceBetween,
  StatusIndicator,
  Table,
  TimeInput,
} from "@cloudscape-design/components";
import { useTeamLookup } from "../../hooks/useTeams";
import { useParams } from "react-router-dom";
import { useMatchesInPlanning, useSuggestMatchTime } from "../../hooks/useMatches";
import { useMemo, useState } from "react";
import { DateTimeDisplay } from "../../components/DateTime";
import { toast } from "react-toastify";
import { Avatar, LoadingBar } from "@cloudscape-design/chat-components";
import { showErrorToast } from "../../components/ErrorToast";

function MatchTimeConfirmationModal({ team_id, match, onClose }) {
  const { data: teams } = useTeamLookup();
  const opponent_id = team_id === match.team_a ? match.team_b : match.team_a;
  const opponent = teams && teams[opponent_id];

  const { mutate: suggestMatchTime } = useSuggestMatchTime();

  const onConfirm = () => {
    suggestMatchTime(
      {
        suggesting_team: team_id,
        match_id: match.id,
        match_time: match.match_time,
      },
      {
        onSuccess: () => {
          toast.success("Confirmed match time/date.");
          onClose();
        },
        onError: showErrorToast,
      }
    );
  };

  return (
    <Modal
      visible={true}
      header={<Header>Confirm date & time for match #{match.id}</Header>}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={onClose} variant="link">
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={!match}>
              Confirm
            </Button>
          </SpaceBetween>
        </Box>
      }
      onDismiss={onClose}
    >
      <SpaceBetween direction="vertical" size="m">
        <Alert type="warning">A confirmation is binding. To change it afterwards, contact an admin.</Alert>

        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "Opponent",
              value: (
                <SpaceBetween direction="horizontal" size="m">
                  <Avatar imgUrl={opponent?.logo_url} />
                  {opponent?.name}
                </SpaceBetween>
              ),
            },
            { label: "Date/Time", value: <DateTimeDisplay timestamp={match.match_time} /> },
          ]}
        />
      </SpaceBetween>
    </Modal>
  );
}

/**
 * @param {Object} param0
 * @param {*} param0.team_id
 * @param {*} param0.match
 * @param {'suggest' | 'reject'} param0.reason
 * @param {*} param0.onClose
 */
function MatchTimeSuggestionModal({ team_id, match, reason, onClose }) {
  const { data: teams } = useTeamLookup();
  const opponent_id = team_id === match.team_a ? match.team_b : match.team_a;
  const opponent = teams && teams[opponent_id];

  const old_dt = new Date(match.match_time);
  const [suggestion, setSuggestion] = useState(
    reason === "suggest"
      ? { date: undefined, time: undefined, datetime: undefined }
      : {
          date: `${old_dt.getUTCFullYear()}-${String(old_dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
            old_dt.getUTCDate()
          ).padStart(2, "0")}`,
          time: `${String(old_dt.getUTCHours()).padStart(2, "0")}:${String(old_dt.getUTCMinutes()).padStart(2, "0")}`,
          datetime: old_dt,
        }
  );

  const { mutate: suggestMatchTime } = useSuggestMatchTime();

  const handleDateChange = (date) => {
    setSuggestion((old) => ({
      ...old,
      date: date,
      datetime: (date && old.time && new Date(`${date}T${old.time}:00Z`)) || undefined,
    }));
  };

  const handleTimeChange = (time) => {
    setSuggestion((old) => ({
      ...old,
      time: time,
      datetime: (time && old.date && new Date(`${old.date}T${time}:00Z`)) || undefined,
    }));
  };

  const onConfirm = () => {
    // Note: There is no difference between suggesting and rejecting a date/time. Both are done by sending a suggestion.
    suggestMatchTime(
      { match_id: match.id, suggesting_team: team_id, match_time: suggestion.datetime },
      {
        onSuccess: () => {
          toast.success(`Sent suggestion for match #${match.id}`);
          onClose();
        },
        onError: showErrorToast,
      }
    );
  };

  return (
    <Modal
      visible={true}
      header={
        <Header>
          <span style={{ textTransform: "capitalize" }}>{reason}</span> date & time for match #{match.id}
        </Header>
      }
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={onClose} variant="link">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isNaN(suggestion.datetime) || suggestion.datetime?.getTime() == old_dt.getTime()}
            >
              {reason === "suggest" ? "Suggest" : "Submit Alternative"}
            </Button>
          </SpaceBetween>
        </Box>
      }
      onDismiss={onClose}
    >
      <SpaceBetween direction="vertical" size="m">
        {reason === "reject" && <Alert type="info">To reject the date/time, please suggest an alternative.</Alert>}
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "Opponent",
              value: (
                <SpaceBetween direction="horizontal" size="m">
                  <Avatar imgUrl={opponent?.logo_url} />
                  <SpaceBetween direction="vertical">
                    {opponent?.name}
                    {reason === "reject" && (
                      <StatusIndicator type="info">
                        <DateTimeDisplay timestamp={match.match_time} />
                      </StatusIndicator>
                    )}
                  </SpaceBetween>
                </SpaceBetween>
              ),
            },
            {
              label: "Date/Time (UTC)",
              value: (
                <SpaceBetween direction="vertical" size="s">
                  <DatePicker onChange={({ detail }) => handleDateChange(detail.value)} value={suggestion.date} />
                  <TimeInput
                    onChange={({ detail }) => handleTimeChange(detail.value)}
                    value={suggestion.time}
                    format="hh:mm"
                    placeholder="hh:mm"
                    invalid={!suggestion.datetime}
                  />
                  {!isNaN(suggestion.datetime) && (
                    <StatusIndicator type="info">
                      <DateTimeDisplay timestamp={suggestion.datetime} />
                    </StatusIndicator>
                  )}
                </SpaceBetween>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </Modal>
  );
}

/**
 * @param {Object} param0
 * @param {*} param0.team_id the id of the team being managed
 * @param {*} param0.matches the matches it participates in which may need planning input
 */
function InPlanningTable({ team: team_id, matches }) {
  const { data: teams } = useTeamLookup();
  const [matchToConfirmDateTime, setMatchToConfirmDateTime] = useState(undefined);
  const [matchToSuggestDateTime, setMatchToSuggestDateTime] = useState(undefined);

  // --- helpers to deal with different scheduling states ---
  const set_by_admin = (match) => match.match_time_state === "FIXED" && match.match_time;
  const waiting_for_admin = (match) => match.match_time_state === "FIXED" && !match.match_time;
  const confirmed = (match) => match.match_time_state === "BOTH_CONFIRMED";
  const waiting_for_opponent = (match) =>
    (match.match_time_state === "A_CONFIRMED" && team_id === match.team_a) ||
    (match.match_time_state === "B_CONFIRMED" && team_id === match.team_b);
  const needs_suggestion = (match) => match.match_time_state === "OPEN_FOR_SUGGESTIONS";
  const needs_confirmation = (match) =>
    (match.match_time_state === "A_CONFIRMED" && team_id === match.team_b) ||
    (match.match_time_state === "B_CONFIRMED" && team_id === match.team_a);
  // --------------------------------------------------------

  const showTeam = (team_id) => (
    <SpaceBetween direction="horizontal" size="s">
      <Avatar imgUrl={teams && teams[team_id]?.logo_url} />
      {(teams && teams[team_id]?.name) || ""}
    </SpaceBetween>
  );

  const matchtime_cell = (match) => {
    return match.match_time && <DateTimeDisplay timestamp={match.match_time} />;
  };

  const schedule_state_cell = (match) => {
    if (set_by_admin(match)) {
      return <StatusIndicator type="info">Fixed by admin.</StatusIndicator>;
    }

    if (waiting_for_admin(match)) {
      return <StatusIndicator type="pending">Waiting for admin.</StatusIndicator>;
    }

    if (waiting_for_opponent(match)) {
      const other_team_id = team_id === match.team_a ? match.team_b : match.team_a;
      return (
        <StatusIndicator type="in-progress">
          Waiting for {teams && teams[other_team_id]?.tag} to confirm.
        </StatusIndicator>
      );
    }

    if (needs_confirmation(match)) {
      return <StatusIndicator type="warning">Please confirm.</StatusIndicator>;
    }

    if (needs_suggestion(match)) {
      return <StatusIndicator type="warning">Please suggest a date & time.</StatusIndicator>;
    }

    if (confirmed(match)) {
      return <StatusIndicator type="success">Confirmed.</StatusIndicator>;
    }

    return <></>;
  };

  const schedule_action_cell = (match) => {
    return (
      <ButtonGroup
        items={[
          {
            id: "confirm",
            text: "confirm",
            type: "icon-button",
            iconName: "check",
            disabled: !needs_confirmation(match),
          },
          {
            id: "reject",
            text: "reject",
            type: "icon-button",
            iconName: "close",
            disabled: !needs_confirmation(match),
          },
          {
            id: "suggest",
            text: "suggest",
            type: "icon-button",
            iconName: "envelope",
            disabled: !needs_suggestion(match),
          },
        ]} // TODO: implement. (and make issuing team explicit!)
        onItemClick={({ detail }) => {
          switch (detail.id) {
            case "confirm":
              setMatchToConfirmDateTime(match);
              break;
            case "suggest":
              setMatchToSuggestDateTime({ match, reason: "suggest" });
              break;
            case "reject":
              setMatchToSuggestDateTime({ match, reason: "reject" });
              break;
            default:
              console.log("unhandled button-group-id:", detail.id);
          }
        }}
      />
    );
  };

  const columns = [
    { id: "match_id", header: "Id", cell: (match) => match.id },
    { id: "match_time", header: "Date/Time", cell: matchtime_cell },
    { id: "match_time_state", header: "State", cell: schedule_state_cell },
    { id: "match_time_action", header: "Schedule", cell: schedule_action_cell },
    {
      id: "opponent",
      header: "Opponent",
      cell: (match) => showTeam(team_id === match.team_a ? match.team_b : match.team_a),
    },
    // TODO: cell for map / link-to-map-ban + "your-turn"-indication
  ];

  return (
    <>
      {matchToConfirmDateTime && (
        <MatchTimeConfirmationModal
          team_id={team_id}
          match={matchToConfirmDateTime}
          onClose={() => setMatchToConfirmDateTime(undefined)}
        />
      )}
      {matchToSuggestDateTime && (
        <MatchTimeSuggestionModal
          team_id={team_id}
          match={matchToSuggestDateTime?.match}
          reason={matchToSuggestDateTime?.reason}
          onClose={() => setMatchToSuggestDateTime(undefined)}
        />
      )}
      <Table
        header={<Header>In Planning</Header>}
        columnDefinitions={columns}
        items={matches}
        variant="borderless"
        stickyHeader
      />
    </>
  );
}

export function TeamManagerOpenTasks() {
  const { teamId } = useParams();
  const teamIdInt = +teamId;

  const { data: allMatchesInPlanning, isLoading: loadingMatches } = useMatchesInPlanning();

  const matchesInPlanning = useMemo(() => {
    return allMatchesInPlanning?.filter((m) => m.team_a === teamIdInt || m.team_b === teamIdInt);
  }, [teamIdInt, allMatchesInPlanning]);

  if (loadingMatches) return <LoadingBar variant="gen-ai-masked" />;

  // TODO: table with matches waiting for a result

  return <InPlanningTable team={teamIdInt} matches={matchesInPlanning} />;
}
