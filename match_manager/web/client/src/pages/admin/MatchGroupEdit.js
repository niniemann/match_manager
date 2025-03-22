/// admin management of matches in a given season

import {
  Button,
  ButtonGroup,
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
import { Avatar, LoadingBar } from "@cloudscape-design/chat-components";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DateTimeDisplay } from "../../components/DateTime";
import { useMaps } from "../../hooks/useMaps";
import { useTeam, useTeams } from "../../hooks/useTeams";

import allies_logo from "../../img/allies_108.png";
import axis_logo from "../../img/axis_108.png";
import { useCreateMatch, useMatch, useMatchesInGroup, useRemoveMatch, useUpdateMatch } from "../../hooks/useMatches";
import { ApiCallError } from "../../components/Dialogs";
import { toast } from "react-toastify";
import { showErrorToast } from "../../components/ErrorToast";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

/// component to select oppenents from a given group
function OpponentSelection({ group_id, onTeamAChange, onTeamBChange }) {
  const [teamAId, setTeamAId] = useState(undefined);
  const [teamBId, setTeamBId] = useState(undefined);

  const { data: teams, isLoading: teamsLoading } = useTeams(group_id);

  const team_options =
    teams?.map((t) => ({ label: t.name, value: t.id, iconUrl: `${API_ENDPOINT}/teams/logo/${t.logo_filename}` })) || [];

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
          triggerVariant="option"
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
          triggerVariant="option"
        />
      </ColumnLayout>
    </FormField>
  );
}

/// component for match schedule selection -- mode as well as time & date (if fixed)
function ScheduleSelection({ onChange, initial }) {
  const schedule_fixed_date_and_time = { label: "Fixed", value: "FIXED" };
  const schedule_allow_team_managers = { label: "Dynamic", value: "OPEN_FOR_SUGGESTIONS" };
  const schedule_options = [schedule_fixed_date_and_time, schedule_allow_team_managers];

  let date, time;
  if (initial?.datetime) {
    const dt = initial.datetime;
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const mday = String(dt.getUTCDate()).padStart(2, "0");
    const hour = String(dt.getUTCHours()).padStart(2, "0");
    const minute = String(dt.getUTCMinutes()).padStart(2, "0");

    date = `${year}-${month}-${mday}`;
    time = `${hour}:${minute}`;
  }

  const [schedule, setSchedule] = useState({
    mode: initial?.mode || "FIXED",
    date: date || "",
    time: time || "",
    datetime: initial?.datetime,
    valid: true,
  });

  useEffect(() => {
    onChange(schedule);
    console.log(schedule);
  }, [onChange, schedule]);

  /// adds a proper datetime value and evaluates the validity of the overall settings
  const augmentDateTime = (schedule) => {
    const dt = new Date(`${schedule.date}T${schedule.time}:00Z`);
    // anything is valid when we are dynamically scheduling, as we don't consider the date/time input in that case
    const valid = schedule.mode !== "FIXED" || !isNaN(dt) || (!schedule.date && !schedule.time);
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
      // edit: actually, keep the strings, only reset the datetime
      // date: newMode === "OPEN_FOR_SUGGESTIONS" ? "" : prev.date,
      // time: newMode === "OPEN_FOR_SUGGESTIONS" ? "" : prev.time,
      datetime: newMode === "OPEN_FOR_SUGGESTIONS" ? undefined : prev.datetime,
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
function MapSelection({ onChange, initial_map_id }) {
  const { data: maps, isLoading } = useMaps();
  const [mapId, setMapId] = useState(initial_map_id);

  const map_options = [
    { label: '-', value: undefined },
    ...maps?.map((m) => ({
      label: m.short_name,
      description: m.full_name,
      value: m.id,
      iconUrl: m.image_filename && `${API_ENDPOINT}/maps/image/${m.image_filename}`,
    })) ?? [],
  ];

  useEffect(() => {
    if (!isLoading && initial_map_id) {
      onChange(maps?.find((m) => m.id === initial_map_id));
    }
  }, [isLoading, initial_map_id, onChange, maps]);

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

/**
 * component and result to select a faction for the teams
 * @param {Object} param0
 * @param {*} param0.team_a
 * @param {*} param0.team_b
 * @param {*} param0.onChange
 * @param {'A' | 'B'} param0.initial_allies
 */
function FactionSelection({ team_a, team_b, onChange, initial_allies }) {
  const option_team_a = { label: team_a?.name || "Team A", value: "A" };
  const option_team_b = { label: team_b?.name || "Team B", value: "B" };
  const options = [option_team_a, option_team_b];

  const [allies, setAllies] = useState(initial_allies === "B" ? option_team_b : option_team_a);

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
    if (!schedule?.valid) {
      toast.error("Invalid date/time provided. Make sure to set both or none.");
      return;
    }

    createMatch(
      {
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
        onSuccess: (match_data) => {
          toast.success(`New match (${match_data.id}): ${teamA.name} vs ${teamB.name} created.`);
          if (!keepOpen) {
            onClose();
          }
        },
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
            <Checkbox
              onChange={({ detail }) => setKeepOpen(detail.checked)}
              checked={keepOpen}
              description="Keep this dialog open after creating a match."
            >
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
    </SpaceBetween>
  );
}

function EditMatchForm({ match_id, onClose }) {
  const { data: match_data, isLoading: matchLoading, error: matchLoadingError } = useMatch(match_id);
  const { data: team_a, isLoading: teamALoading, error: teamALoadingError } = useTeam(match_data?.team_a);
  const { data: team_b, isLoading: teamBLoading, error: teamBLoadingError } = useTeam(match_data?.team_b);

  const { mutate: updateMatch, isLoading: isUpdating, error: errorUpdating } = useUpdateMatch();

  const isLoading = matchLoading || teamALoading || teamBLoading;
  const error = matchLoadingError || teamALoadingError || teamBLoadingError || errorUpdating;

  const oldMatchData = useMemo(
    () => ({
      game_map: match_data?.game_map,
      map_selection_mode: match_data?.map_selection_mode,
      team_a_faction: match_data?.team_a_faction,

      schedule: {
        // reduce all "confirmed" states to "OPEN_FOR_SUGGESTIONS", as that is what the form returns if nothing changes
        mode: match_data?.match_time_state === "FIXED" ? "FIXED" : "OPEN_FOR_SUGGESTIONS",
        datetime: match_data?.match_time && new Date(match_data.match_time),
        valid: true,
      },
    }),
    [match_data]
  );

  // race condition: if oldMatchData is not loaded yet... newMatchData is initialized different from the actual old data. :(
  const [newMatchData, setNewMatchData] = useState({ ...oldMatchData });
  // to circumvent this: reset newMatchData once after loading!
  useEffect(() => {
    if (isLoading) return;
    setNewMatchData(oldMatchData);
  }, [isLoading, setNewMatchData]);

  const hasUnsavedChanges = useMemo(() => {
    console.log(`old:`, oldMatchData);
    console.log(`new:`, newMatchData);
    return (
      oldMatchData.schedule.mode !== newMatchData.schedule.mode ||
      oldMatchData.schedule.datetime?.getTime() !== newMatchData.schedule.datetime?.getTime() ||
      oldMatchData.game_map !== newMatchData.game_map ||
      oldMatchData.map_selection_mode !== newMatchData.map_selection_mode ||
      oldMatchData.team_a_faction !== newMatchData.team_a_faction
    );
  }, [oldMatchData, newMatchData]);

  // wrapped in useCallback to maintain a stable function reference -- the ScheduleSelection component memoizes it,
  // and without wrapping it the function identity changes every re-render, triggering the effect in the selection,
  // changing state, triggering a re-render, changing the function identity, ... in an infinite loop.
  const handleNewSchedule = useCallback(
    (schedule) => {
      setNewMatchData((old) => ({
        ...old,
        schedule: {
          ...old.schedule,
          mode: schedule.mode,
          datetime: schedule.datetime,
          valid: schedule.valid,
        },
      }));
    },
    [setNewMatchData]
  );

  const handleMapModeChange = useCallback(
    (mode) => {
      setNewMatchData((old) => ({ ...old, map_selection_mode: mode }));

      // reset map and faction settings when switching to ban-modes
      if (mode !== "FIXED") setNewMatchData((old) => ({ ...old, game_map: null }));
      if (mode === "BAN_MAP_AND_FACTION") setNewMatchData((old) => ({ ...old, team_a_faction: null }));
    },
    [setNewMatchData]
  );

  const handleMapChange = useCallback((map) => {
    setNewMatchData((old) => ({ ...old, game_map: map?.id }));
  }, [setNewMatchData]);

  const handleFactionChange = useCallback(
    (factions) => {
      setNewMatchData((old) => ({ ...old, team_a_faction: factions.team_a }));
    },
    [setNewMatchData]
  );

  // Ensure that everything is loaded before rendering the editing-components.
  // We need the data to set initial values.
  if (isLoading) {
    return <LoadingBar variant="gen-ai-masked" />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isUpdating) return;

    if (!newMatchData.schedule?.valid) {
      toast.error("Invalid date/time provided. Make sure to set both or none.");
      return;
    }

    // create the diff of settings
    // set use 'null' to represent 'None', and 'undefined' for 'not changed'
    const game_map_changed = newMatchData.game_map !== oldMatchData.game_map;
    const map_mode_changed = newMatchData.map_selection_mode !== oldMatchData.map_selection_mode;
    const match_time_changed = newMatchData.schedule.datetime !== oldMatchData.schedule.datetime;
    const schedule_mode_changed = newMatchData.schedule.mode !== oldMatchData.schedule.mode;
    const faction_changed = newMatchData.team_a_faction !== oldMatchData.team_a_faction;

    const patch = {
      game_map: game_map_changed ? newMatchData.game_map || null : undefined,
      map_selection_mode: map_mode_changed ? newMatchData.map_selection_mode || null : undefined,
      match_time: match_time_changed ? newMatchData.schedule.datetime || null : undefined,
      match_time_state: schedule_mode_changed ? newMatchData.schedule.mode || null : undefined,
      team_a_faction: faction_changed ? newMatchData.team_a_faction || null : undefined,
    };

    updateMatch(
      { match_id, match_data: patch },
      {
        onSuccess: () => {
          toast.success(`Updated match ${match_id}`);
          onClose();
        },
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
              <Button variant="primary" disabled={isLoading || !hasUnsavedChanges || !newMatchData.schedule?.valid}>
                Save
              </Button>
            </SpaceBetween>
          }
        >
          {error && <ApiCallError error={error.response?.data} />}

          <SpaceBetween direction="vertical" size="xs">
            <FormField label="Teams">
              <ColumnLayout columns={2}>
                <Select
                  selectedOption={{
                    label: team_a?.name,
                    value: team_a?.id,
                    iconUrl: team_a?.logo_filename && `${API_ENDPOINT}/teams/logo/${team_a.logo_filename}`,
                  }}
                  loadingText="loading"
                  statusType={isLoading && "loading"}
                  triggerVariant="option"
                  disabled
                />
                <Select
                  selectedOption={{
                    label: team_b?.name,
                    value: team_b?.id,
                    iconUrl: team_b?.logo_filename && `${API_ENDPOINT}/teams/logo/${team_b.logo_filename}`,
                  }}
                  loadingText="loading"
                  statusType={isLoading && "loading"}
                  triggerVariant="option"
                  disabled
                />
              </ColumnLayout>
            </FormField>
            <ScheduleSelection onChange={handleNewSchedule} initial={oldMatchData.schedule} />

            <MapSelectionModeSelection onChange={handleMapModeChange} />
            {newMatchData.map_selection_mode === "FIXED" && (
              <MapSelection onChange={handleMapChange} initial_map_id={oldMatchData.game_map} />
            )}
            {newMatchData.map_selection_mode === "BAN_MAP_AND_FACTION" || (
              <FactionSelection
                team_a={team_a}
                team_b={team_b}
                onChange={handleFactionChange}
                initial_allies={oldMatchData.team_a_faction === "AXIS" ? "B" : "A"}
              />
            )}
          </SpaceBetween>
        </Form>
      </form>
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
  const { mutate: removeMatch } = useRemoveMatch();

  const [matchToEdit, setMatchToEdit] = useState(undefined);

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
    {
      id: "actions",
      header: "",
      cell: (match) => (
        <ButtonGroup
          onItemClick={({ detail }) => {
            switch (detail.id) {
              case "delete":
                removeMatch(match.id, {
                  onError: (err) => showErrorToast(err),
                  onSuccess: () => toast.success(`removed match ${match.id}`),
                });
                break;
              case "edit":
                setMatchToEdit(match);
                break;
              default:
                console.log(JSON.stringify(detail));
            }
          }}
          items={[
            { type: "icon-button", id: "edit", iconName: "edit", text: "edit" },
            {
              type: "menu-dropdown",
              id: "more",
              text: "more",
              items: [{ id: "delete", iconName: "remove", text: "delete" }],
            },
          ]}
          variant="icon"
          dropdownExpandToViewport
        />
      ),
    },
  ];

  return (
    <>
      {newMatchModalVisible && (
        <Modal visible={newMatchModalVisible} header="Create Match" onDismiss={() => setNewMatchModalVisible(false)}>
          <NewMatchForm group_id={groupId} onClose={() => setNewMatchModalVisible(false)} />
        </Modal>
      )}
      {matchToEdit && (
        <Modal visible={true} header={`Edit Match #${matchToEdit.id}`} onDismiss={() => setMatchToEdit(undefined)}>
          <EditMatchForm match_id={matchToEdit.id} onClose={() => setMatchToEdit(undefined)} />
        </Modal>
      )}
      <Table
        columnDefinitions={columns}
        stickyHeader
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
