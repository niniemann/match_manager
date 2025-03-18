/// admin management of matches in a given season

import {
  Button,
  Checkbox,
  ColumnLayout,
  Container,
  DatePicker,
  Form,
  FormField,
  Header,
  Modal,
  Popover,
  RadioGroup,
  Select,
  SpaceBetween,
  StatusIndicator,
  Table,
  TimeInput,
} from "@cloudscape-design/components";
import { Avatar } from "@cloudscape-design/chat-components";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DateTimeDisplay } from "../../components/DateTime";
import { useMaps } from "../../hooks/useMaps";
import { useTeams } from "../../hooks/useTeams";

import allies_logo from "../../img/allies_108.png";
import axis_logo from "../../img/axis_108.png";
import { MatchPreview } from "../../components/Match";
import { useCreateMatch, useMatchesInGroup } from "../../hooks/useMatches";
import { ApiCallError } from "../../components/Dialogs";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

/// component to select oppenents from a given group
function OpponentSelection({ group_id, onTeamAChange, onTeamBChange }) {
  const [teamAId, setTeamAId] = useState(undefined);
  const [teamBId, setTeamBId] = useState(undefined);

  const { data: teams, teamsLoading } = useTeams(group_id);

  const team_options = teams?.map((t) => ({ label: t.name, value: t.id })) || [];

  return (
    <FormField label="Teams">
      <ColumnLayout columns={2}>
        <Select
          selectedOption={team_options.find((o) => o.value === teamAId)}
          options={team_options}
          onChange={({ detail }) => {
            setTeamAId(detail.selectedOption.value);
            const team = teams.find((t) => t.id === detail.selectedOption.value);
            onTeamAChange(team);
          }}
          loadingText="loading"
          statusType={teamsLoading && "loading"}
        />
        <Select
          selectedOption={team_options.find((o) => o.value === teamBId)}
          options={team_options}
          onChange={({ detail }) => {
            setTeamBId(detail.selectedOption.value);
            const team = teams.find((t) => t.id === detail.selectedOption.value);
            onTeamBChange(team);
          }}
          loadingText="loading"
          statusType={teamsLoading && "loading"}
        />
      </ColumnLayout>
    </FormField>
  );
}

/// component for match schedule selection -- mode as well as time & date (if fixed)
function ScheduleSelection({ onChange }) {
  const schedule_fixed_date_and_time = { label: "Fixed", value: "FIXED" };
  const schedule_allow_team_managers = { label: "Dynamic", value: "OPEN_FOR_SUGGESTIONS" };
  const schedule_options = [schedule_fixed_date_and_time, schedule_allow_team_managers];

  const [schedule, setSchedule] = useState({
    mode: "FIXED",
    date: "",
    time: "",
    datetime: undefined,
    valid: true,
  });

  useEffect(() => {
    onChange(schedule);
  }, [onChange, schedule]);

  /// adds a proper datetime value and evaluates the validity of the overall settings
  const augmentDateTime = (schedule) => {
    const dt = new Date(`${schedule.date}T${schedule.time}:00Z`);
    const valid = !isNaN(dt) || (!schedule.date && !schedule.time);
    return {
      ...schedule,
      datetime: schedule.mode === "FIXED" && !isNaN(dt) ? dt : undefined,
      valid: valid,
    };
  };

  const handleModeChange = (newMode) => {
    setSchedule((prev) => ({
      ...prev,
      mode: newMode,
      // reset date/time when allowing team managers to choose for themselves
      date: newMode === "OPEN_FOR_SUGGESTIONS" ? "" : prev.date,
      time: newMode === "OPEN_FOR_SUGGESTIONS" ? "" : prev.time,
    }));
    setSchedule(augmentDateTime);
  };

  const handleDateChange = (newDate) => {
    setSchedule((prev) => ({
      ...prev,
      date: newDate,
    }));
    setSchedule(augmentDateTime);
  };

  const handleTimeChange = (newTime) => {
    setSchedule((prev) => ({
      ...prev,
      time: newTime,
    }));
    setSchedule(augmentDateTime);
  };

  return (
    <>
      <FormField label="Scheduling">
        <RadioGroup
          onChange={({ detail }) => handleModeChange(detail.value)}
          value={schedule.mode}
          items={schedule_options}
        />
      </FormField>

      {schedule.mode === "FIXED" && (
        <FormField label="Date/Time (UTC)">
          <ColumnLayout columns={2}>
            <DatePicker onChange={({ detail }) => handleDateChange(detail.value)} value={schedule.date} />
            <TimeInput
              onChange={({ detail }) => handleTimeChange(detail.value)}
              value={schedule.time}
              format="hh:mm"
              placeholder="hh:mm"
              invalid={!schedule.valid}
            />
          </ColumnLayout>
        </FormField>
      )}
    </>
  );
}

/// component to determine the map selection mode -- fixed / ban / ...
function MapSelectionModeSelection({ onChange }) {
  const map_selection_fixed = { label: "Fixed", value: "FIXED" };
  const map_selection_ban_map = { label: "Ban map", value: "BAN_MAP_FIXED_FACTION" };
  const map_selection_ban_map_and_faction = { label: "Ban map & faction", value: "BAN_MAP_AND_FACTION" };

  const map_selection_modes = [map_selection_fixed, map_selection_ban_map, map_selection_ban_map_and_faction];
  const [mapSelectionMode, setMapSelectionMode] = useState(map_selection_fixed.value);

  return (
    <>
      <FormField label="Map Selection">
        <RadioGroup
          value={mapSelectionMode}
          onChange={({ detail }) => {
            setMapSelectionMode(detail.value);
            onChange(detail.value);
          }}
          items={map_selection_modes}
        />
      </FormField>
    </>
  );
}

/// component and result to select a map
function MapSelection({ onChange }) {
  const { data: maps, isLoading } = useMaps();
  const [mapId, setMapId] = useState(undefined);

  const map_options = maps?.map((m) => ({
    label: m.short_name,
    description: m.full_name,
    value: m.id,
    iconUrl: m.image_filename && `${API_ENDPOINT}/maps/image/${m.image_filename}`,
  }));

  return (
    <Select
      selectedOption={mapId && map_options?.find((m) => m.value === mapId)}
      onChange={({ detail }) => {
        setMapId(detail.selectedOption.value);
        onChange(maps?.find((m) => m.id === detail.selectedOption.value));
      }}
      options={map_options}
      placeholder="select a map"
      triggerVariant="option"
      loadingText="loading"
      statusType={isLoading && "loading"}
    />
  );
}

/// component and result to select a faction for the teams
function FactionSelection({ team_a, team_b, onChange }) {
  const option_team_a = { label: team_a?.name || "Team A", value: "A" };
  const option_team_b = { label: team_b?.name || "Team B", value: "B" };
  const options = [option_team_a, option_team_b];

  const [allies, setAllies] = useState(option_team_a);

  useEffect(() => {
    onChange({
      allies: allies.value === "A" ? team_a : team_b,
      axis: allies.value === "A" ? team_b : team_a,
      team_a: allies.value === "A" ? "ALLIES" : "AXIS",
      team_b: allies.value === "A" ? "AXIS" : "ALLIES",
    });
  }, [allies, team_a, team_b, onChange]);

  return (
    <>
      <ColumnLayout columns={2}>
        <Select
          selectedOption={{ ...options.find((o) => o.value === allies.value), iconUrl: allies_logo }}
          onChange={({ detail }) => {
            setAllies(detail.selectedOption);
          }}
          options={options}
          triggerVariant="option"
        />
        <Select
          selectedOption={{ ...options.find((o) => o.value !== allies.value), iconUrl: axis_logo }}
          disabled
          triggerVariant="option"
        />
      </ColumnLayout>
    </>
  );
}

/// creates a new match within the given match_group
function NewMatchForm({ group_id, onClose }) {
  const [teamA, setTeamA] = useState(undefined);
  const [teamB, setTeamB] = useState(undefined);

  const [schedule, setSchedule] = useState(undefined);
  const [mapSelectionMode, setMapSelectionMode] = useState("FIXED");
  const [selectedMap, setSelectedMap] = useState(undefined);
  const [factions, setFactions] = useState({});
  const [keepOpen, setKeepOpen] = useState(false);

  const { mutate: createMatch, error: errorCreatingMatch, isLoading: isCreatingMatch } = useCreateMatch();

  const handleSubmit = (e) => {
    e.preventDefault();

    createMatch({
      group_id: group_id,
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      game_map: selectedMap?.id,
      team_a_faction: factions?.team_a,
      map_selection_mode: mapSelectionMode,
      match_time: schedule.datetime,
      match_time_state: schedule.mode,
    },
    {
      onSuccess: () => {
        if (!keepOpen) {
          onClose();
        }
      }
    }
  );
  };

  return (
    <SpaceBetween direction="vertical" size="l">
      <form onSubmit={handleSubmit}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button formAction="none" variant="link" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!teamA || !teamB || isCreatingMatch}>
                Create
              </Button>
            </SpaceBetween>
          }
          secondaryActions={
            <Checkbox onChange={({detail}) => setKeepOpen(detail.checked)}
            checked={keepOpen} description="Keep this dialog open after creating a match.">
              Create more
            </Checkbox>
          }
        >
          {errorCreatingMatch && <ApiCallError error={errorCreatingMatch.response.data} />}

          <SpaceBetween direction="vertical" size="xs">
            <OpponentSelection group_id={group_id} onTeamAChange={setTeamA} onTeamBChange={setTeamB} />
            <ScheduleSelection onChange={setSchedule} />
            <MapSelectionModeSelection
              onChange={(mode) => {
                setMapSelectionMode(mode);
                if (mode !== "FIXED") setSelectedMap(undefined);
                if (mode === "BAN_MAP_AND_FACTION") setFactions(undefined);
              }}
            />
            {mapSelectionMode === "FIXED" && <MapSelection onChange={setSelectedMap} />}
            {mapSelectionMode === "BAN_MAP_AND_FACTION" || (
              <FactionSelection team_a={teamA} team_b={teamB} onChange={setFactions} />
            )}
          </SpaceBetween>
        </Form>
      </form>

      <Container header={<Header>Preview</Header>}>
        <MatchPreview
          match_data={{
            game_map: selectedMap?.id,
            match_time: schedule?.datetime,
            match_time_state: schedule?.mode,
            team_a: teamA?.id,
            team_b: teamB?.id,
            team_a_faction: factions?.team_a,
          }}
        />
      </Container>
    </SpaceBetween>
  );
}

export function MatchGroupEdit() {
  const { groupId } = useParams();
  const [group, setGroup] = useState({}); // info about the selected group

  // we query data for *all* teams, not just the ones in the group, as it is
  // possible to remove a team from the group without removing past matches...
  const [teamLookup, setTeamLookup] = useState({}); // lookup for team-id -> team-info
  const [newMatchModalVisible, setNewMatchModalVisible] = useState(false);

  const { data: matches, isLoading: matchesLoading } = useMatchesInGroup(groupId);

  useEffect(() => {
    const init = async () => {
      // gather season- and group-info
      const { data: groupData } = await axios.get(`${API_ENDPOINT}/seasons/groups/${groupId}`);
      console.log(groupData);
      setGroup(groupData);

      // gather team info (there might be matches of teams no longer in the season -- theoretically.)
      const { data: teamData } = await axios.get(`${API_ENDPOINT}/teams`);
      const lookup = teamData.reduce((acc, team) => {
        acc[team.id] = team;
        return acc;
      }, {});
      setTeamLookup(lookup);
    };

    init();
  }, [groupId]);

  const getStateIndicator = (match) => {
    switch (match.state) {
      case "DRAFT":
        return <StatusIndicator type="stopped">Draft</StatusIndicator>;
      case "PLANNING":
        return <StatusIndicator type="in-progress">In planning</StatusIndicator>;
      case "ACTIVE":
        return <StatusIndicator type="pending">Waiting for result</StatusIndicator>;
      case "COMPLETED":
        return <StatusIndicator type="success">Done</StatusIndicator>;
      case "CANCELLED":
        return <StatusIndicator type="error">Cancelled</StatusIndicator>;
      default:
        return <StatusIndicator type="warning">Unknown</StatusIndicator>;
    }
  };

  const waitingForConfirm = (team_id, match_time) => {
    const tooltip = `Waiting for ${teamLookup[team_id]?.name} to confirm.`;
    return (
      <Popover content={tooltip} dismissButton={false}>
        <StatusIndicator type="in-progress">
          <DateTimeDisplay timestamp={match_time} />
        </StatusIndicator>
      </Popover>
    );
  };

  const getScheduleIndicator = (match) => {
    switch (match.match_time_state) {
      case "FIXED":
        return match.match_time && <DateTimeDisplay timestamp={match.match_time} />;
      case "OPEN_FOR_SUGGESTIONS":
        return <StatusIndicator type="pending">Waiting for suggestions</StatusIndicator>;
      case "A_CONFIRMED":
        return waitingForConfirm(match.team_b, match.match_time);
      case "B_CONFIRMED":
        return waitingForConfirm(match.team_a, match.match_time);
      case "BOTH_CONFIRMED":
        return (
          <StatusIndicator type="success">
            <DateTimeDisplay timestamp={match.match_time} />
          </StatusIndicator>
        );
      default:
        return <StatusIndicator type="error">Unknown</StatusIndicator>;
    }
  };

  const showTeam = (team_id) => {
    const team = teamLookup[team_id];
    const logo_url = team?.logo_filename && `${API_ENDPOINT}/teams/logo/${team.logo_filename}`;
    return (
      <SpaceBetween direction="horizontal" size="xs">
        <Avatar imgUrl={logo_url} /> {team?.name}
      </SpaceBetween>
    );
  };

  const columns = [
    { id: "match_id", header: "Id", cell: (match) => match.id },
    { id: "match_time", header: "Date/Time", cell: getScheduleIndicator },
    { id: "team_a", header: "Team A", cell: (match) => showTeam(match.team_a) },
    { id: "team_b", header: "Team B", cell: (match) => showTeam(match.team_b) },
    { id: "state", header: "State", cell: getStateIndicator },
  ];

  return (
    <>
      {newMatchModalVisible && (
        <Modal visible={newMatchModalVisible} header="Create Match" onDismiss={() => setNewMatchModalVisible(false)}>
          <NewMatchForm group_id={groupId} onClose={() => setNewMatchModalVisible(false)} />
        </Modal>
      )}
      <Table
        columnDefinitions={columns}
        items={matches}
        trackBy="id"
        empty={<p>Nothing to see here.</p>}
        variant="full-page"
        header={
          <Header
            actions={
              <Button variant="primary" onClick={() => setNewMatchModalVisible(true)}>
                Create Match
              </Button>
            }
          >
            All Matches in "{group.name}"
          </Header>
        }
        loading={matchesLoading}
      />
    </>
  );
}
