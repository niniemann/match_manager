/// admin management of matches in a given season

import {
  Button,
  ColumnLayout,
  Container,
  DatePicker,
  Form,
  FormField,
  Header,
  KeyValuePairs,
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

/// component and result for match schedule selection
function useScheduleSelection() {
  const schedule_fixed_date_and_time = { label: "Fixed", value: "FIXED" };
  const schedule_allow_team_managers = { label: "Dynamic", value: "OPEN_FOR_SUGGESTIONS" };
  const schedule_options = [schedule_fixed_date_and_time, schedule_allow_team_managers];

  const [selectedScheduleOption, setSelectedScheduleOption] = useState(schedule_fixed_date_and_time);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState(undefined);

  const result = useMemo(() => {
    let dt = null;
    if (selectedScheduleOption.value === "FIXED" && (selectedDate || selectedTime)) {
      dt = new Date(`${selectedDate}T${selectedTime}:00Z`);
    }

    return {
      type: selectedScheduleOption.value,
      datetime: dt,
      error: dt != null && isNaN(dt?.getTime()) ? "Invalid date/time" : "",
    };
  }, [selectedDate, selectedTime, selectedScheduleOption]);

  const component = (
    <>
      <FormField label="Scheduling">
        <RadioGroup
          onChange={({ detail }) => setSelectedScheduleOption(detail)}
          value={selectedScheduleOption.value}
          items={schedule_options}
        />
      </FormField>

      {selectedScheduleOption.value === "FIXED" && (
        <FormField label="Date/Time (UTC)">
          <ColumnLayout columns={2}>
            <DatePicker onChange={({ detail }) => setSelectedDate(detail.value)} value={selectedDate} />
            <TimeInput
              onChange={({ detail }) => setSelectedTime(detail.value)}
              value={selectedTime}
              format="hh:mm"
              placeholder="hh:mm"
              invalid={result.datetime && Boolean(result.error)}
            />
          </ColumnLayout>
        </FormField>
      )}
    </>
  );

  return { schedule: result, scheduleSelection: component };
}

/// component and result to determine the map selection mode -- fixed / ban / ...
function useMapSelectionModeSelection() {
  const map_selection_fixed = { label: "Fixed", value: "FIXED" };
  const map_selection_ban_map = { label: "Ban map", value: "BAN_MAP_FIXED_FACTION" };
  const map_selection_ban_map_and_faction = { label: "Ban map & faction", value: "BAN_MAP_AND_FACTION" };

  const map_selection_modes = [map_selection_fixed, map_selection_ban_map, map_selection_ban_map_and_faction];
  const [mapSelectionMode, setMapSelectionMode] = useState(map_selection_fixed);

  const component = (
    <>
      <FormField label="Map Selection">
        <RadioGroup
          value={mapSelectionMode.value}
          onChange={({ detail }) => setMapSelectionMode(detail)}
          items={map_selection_modes}
        />
      </FormField>
    </>
  );

  return { mapSelectionMode: mapSelectionMode.value, mapSelectionModeSelection: component };
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
  const allies_options = [option_team_a, option_team_b];

  const [allies, setAllies] = useState(option_team_a);
  useEffect(() => {
    onChange({
      allies: allies.value === "A" ? team_a : team_b,
      axis: allies.value === "A" ? team_b : team_a,
      team_a: allies.value === "A" ? "ALLIES" : "AXIS",
      team_b: allies.value === "A" ? "AXIS" : "ALLIES",
    });
  }, [allies, team_a, team_b]);

  return (
    <>
      <ColumnLayout columns={2}>
        <FormField label="Allies">
          <Select
            selectedOption={allies}
            onChange={({ detail }) => {
              setAllies(detail.selectedOption);
            }}
            options={allies_options}
          />
        </FormField>
        <FormField label="Axis">
          <Select selectedOption={allies_options.find((o) => o.value !== allies.value)} disabled />
        </FormField>
      </ColumnLayout>
    </>
  );
}

/// creates a new match within the given match_group
function NewMatchForm({ group_id }) {
  const [teamA, setTeamA] = useState(undefined);
  const [teamB, setTeamB] = useState(undefined);

  const { schedule, scheduleSelection } = useScheduleSelection();
  const { mapSelectionMode, mapSelectionModeSelection } = useMapSelectionModeSelection();
  const [selectedMap, setSelectedMap] = useState(undefined);
  const [factions, setFactions] = useState({});

  return (
    <>
      <Form>
        <SpaceBetween direction="vertical" size="xs">
          <OpponentSelection group_id={group_id} onTeamAChange={setTeamA} onTeamBChange={setTeamB} />
          {scheduleSelection}
          {mapSelectionModeSelection}
          {mapSelectionMode === "FIXED" && <MapSelection onChange={setSelectedMap} />}
          {mapSelectionMode === "BAN_MAP_AND_FACTION" || (
            <FactionSelection team_a={teamA} team_b={teamB} onChange={setFactions} />
          )}
        </SpaceBetween>
      </Form>

      <Container header="preview">
        <KeyValuePairs
          columns={2}
          items={[
            { label: "team a", value: JSON.stringify(teamA) },
            { label: "team b", value: JSON.stringify(teamB) },
            { label: "schedule mode", value: schedule.type },
            { label: "schedule date/time", value: <DateTimeDisplay timestamp={schedule.datetime} /> },
            { label: "map selection mode", value: mapSelectionMode },
            { label: "selected map", value: JSON.stringify(selectedMap) },
            { label: "allies", value: factions.allies?.name },
            { label: "axis", value: factions.axis?.name },
            { label: "team_a", value: factions.team_a },
            { label: "team_b", value: factions.team_b },
          ]}
        />
      </Container>
    </>
  );
}

export function MatchGroupEdit() {
  const { groupId } = useParams();
  const [group, setGroup] = useState({}); // info about the selected group

  // we query data for *all* teams, not just the ones in the group, as it is
  // possible to remove a team from the group without removing past matches...
  const [teamLookup, setTeamLookup] = useState({}); // lookup for team-id -> team-info
  const [matches, setMatches] = useState([]); // table rows
  const [newMatchModalVisible, setNewMatchModalVisible] = useState(false);

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

      // gather match data
      const { data: matchData } = await axios.get(`${API_ENDPOINT}/seasons/groups/${groupId}/matches`);
      setMatches(matchData);
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
        <Modal visible={newMatchModalVisible} header="Create Match">
          <NewMatchForm group_id={groupId} />
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
      />
    </>
  );
}
