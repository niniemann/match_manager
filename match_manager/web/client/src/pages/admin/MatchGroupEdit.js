/// admin management of matches in a given season

import {
  Button,
  ColumnLayout,
  Container,
  DatePicker,
  Form,
  FormField,
  Header,
  Input,
  KeyValuePairs,
  Modal,
  Popover,
  RadioGroup,
  Select,
  SpaceBetween,
  StatusIndicator,
  Table,
  TimeInput,
  Wizard,
} from "@cloudscape-design/components";
import { Avatar } from "@cloudscape-design/chat-components";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DateTimeDisplay } from "../../components/DateTime";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

/// component and result values for team selection for a match
function useOppenentSelection() {
  const [selectedTeamA, setSelectedTeamA] = useState(undefined);
  const [selectedTeamB, setSelectedTeamB] = useState(undefined);

  const teams = [
    {
      "description": "",
      "id": 8,
      "logo_filename": "12d6e9b73d2d44d289d8b7fc2a8cfae1_HTD_violet_grande.png",
      "managers": null,
      "name": "HaiiTeD",
      "tag": "HTD"
    },
    {
      "description": "Your friendly neighbourhood fiery-bird.",
      "id": 6,
      "logo_filename": "89f45303b21140f89dab7ddf45fed227_phxfat.png",
      "managers": null,
      "name": "team.phoenix",
      "tag": "phx"
    }
  ];

  const team_options = teams.map((t) => ({ label: t.name, value: t.id }));

  const component = (
    <FormField label="Teams">
      <ColumnLayout columns={2}>
        <Select
          selectedOption={team_options.find((o) => o.value === selectedTeamA?.id)}
          options={team_options}
          onChange={({ detail }) => setSelectedTeamA(teams.find((t) => t.id === detail.selectedOption.value))}
        />
        <Select
          selectedOption={team_options.find((o) => o.value === selectedTeamB?.id)}
          options={team_options}
          onChange={({ detail }) => setSelectedTeamB(teams.find((t) => t.id === detail.selectedOption.value))}
        />
      </ColumnLayout>
    </FormField>
  );

  return { teamA: selectedTeamA, teamB: selectedTeamB, opponentSelection: component };
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
function useMapSelection() {
  const maps = [
    {
      full_name: "Saint Mere Eglise",
      id: 1,
      image_filename: "5aa999bb07a448bab221e2ddbd217adb_sme.webp",
      short_name: "SME",
    },
    {
      full_name: "Saint Marie Du Mont",
      id: 2,
      image_filename: null,
      short_name: "SMDM",
    },
    {
      full_name: "Carentan",
      id: 3,
      image_filename: "8f1287ffdbb540e48d52e92c79819e66_carentan.webp",
      short_name: "Carentan",
    },
  ];

  const [mapId, setMapId] = useState(undefined);
  const selectedMap = useMemo(() => maps.find((m) => m.id === mapId), [maps, mapId]);

  const map_options = maps.map((m) => ({
    label: m.short_name,
    description: m.full_name,
    value: m.id,
    iconUrl: m.image_filename && `${API_ENDPOINT}/maps/image/${m.image_filename}`,
  }));

  const component = (
    <Select
      selectedOption={mapId && map_options.find((m) => m.value === mapId)}
      onChange={({ detail }) => setMapId(detail.selectedOption.value)}
      options={map_options}
      placeholder="select a map"
      triggerVariant="option"
    />
  );

  return { selectedMap, mapSelection: component };
}

/// component and result to select a faction for the teams
function useFactionSelection({ team_a, team_b }) {
  const allies_options = [
    { label: team_a?.name, value: team_a?.id },
    { label: team_b?.name, value: team_b?.id },
  ];

  const [allies, setAllies] = useState(undefined);
  const axis = useMemo(() => allies && (allies.id === team_a?.id ? team_b : team_a), [team_a, team_b, allies]);

  const team_a_faction = useMemo(() => allies && (allies.id === team_a?.id ? "ALLIES" : "AXIS"), [team_a, allies]);
  const team_b_faction = useMemo(() => allies && (allies.id === team_b?.id ? "ALLIES" : "AXIS"), [team_b, allies]);

  const component = (
    <>

      <ColumnLayout columns={2}>

        <FormField label="Allies">
          <Select
            selectedOption={allies_options.find((o) => o.value === allies?.id)}
            onChange={({ detail }) => setAllies(detail.selectedOption.value === team_a?.id ? team_a : team_b)}
            options={allies_options} />
        </FormField>

        <FormField label="Axis">
          <Select
            selectedOption={allies && allies_options.find((o) => o.value !== allies.id)}
            disabled
          />
        </FormField>
      </ColumnLayout>

    </>
  );

  return { allies, axis, team_a_faction, team_b_faction, factionSelection: component };
}

function NewMatchForm() {
  const { teamA, teamB, opponentSelection } = useOppenentSelection();
  const { schedule, scheduleSelection } = useScheduleSelection();
  const { mapSelectionMode, mapSelectionModeSelection } = useMapSelectionModeSelection();
  const { selectedMap, mapSelection } = useMapSelection();
  const { allies, axis, team_a_faction, team_b_faction, factionSelection } = useFactionSelection({ team_a: teamA, team_b: teamB });

  return (
    <>
      <Form>
        <SpaceBetween direction="vertical" size="m">
          {opponentSelection}
          {scheduleSelection}
          {mapSelectionModeSelection}
          {mapSelectionMode === "FIXED" && mapSelection}
          {mapSelectionMode === "BAN_MAP_AND_FACTION" || factionSelection}
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
            { label: "allies", value: JSON.stringify(allies) },
            { label: "axis", value: JSON.stringify(axis) },
            { label: "team a faction", value: team_a_faction },
            { label: "team b faction", value: team_b_faction },
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
          <NewMatchForm />
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
