/// admin management of matches in a given season

import {
  Button,
  ColumnLayout,
  Container,
  DatePicker,
  Form,
  FormField,
  Header,
  Modal,
  Popover,
  Select,
  SpaceBetween,
  StatusIndicator,
  Table,
  TimeInput,
  Wizard,
} from "@cloudscape-design/components";
import { Avatar } from "@cloudscape-design/chat-components";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DateTimeDisplay } from "../../components/DateTime";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function NewMatchForm() {
  const [selectedTeamA, setSelectedTeamA] = useState(undefined);
  const [selectedTeamB, setSelectedTeamB] = useState(undefined);

  const team_options = [
    { label: "Team 1", value: "1" },
    { label: "Team 2", value: "2" },
    { label: "Team 3", value: "3" },
    { label: "Team 4", value: "4" },
  ];

  const schedule_fixed_date_and_time = { label: "Fixed", value: "FIXED" };
  const schedule_allow_team_managers = { label: "Dynamic", value: "OPEN_FOR_SUGGESTIONS" };
  const schedule_options = [schedule_fixed_date_and_time, schedule_allow_team_managers];

  const [selectedScheduleOption, setSelectedScheduleOption] = useState(schedule_fixed_date_and_time);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState(undefined);

  const step_select_opponents = {
    title: "Select teams",
    content: (
      <Container>
      <ColumnLayout columns={2}>
        <FormField label="Team A">
          <Select
            selectedOption={selectedTeamA}
            options={team_options}
            onChange={({ detail }) => setSelectedTeamA(detail.selectedOption)}
          />
        </FormField>
        <FormField label="Team B">
          <Select
            selectedOption={selectedTeamB}
            options={team_options}
            onChange={({ detail }) => setSelectedTeamB(detail.selectedOption)}
          />
        </FormField>
      </ColumnLayout>
      </Container>
    ),
  };

  const step_configure_scheduling = {
    title: "Schedule",
    isOptional: true,
    content: (
      <Container>
      <SpaceBetween direction="vertical" size="l">
        <FormField label="Scheduling">
          <Select
            selectedOption={selectedScheduleOption}
            options={schedule_options}
            onChange={({ detail }) => setSelectedScheduleOption(detail.selectedOption)}
            placeholder="yyyy/mm/dd"
          />
        </FormField>
        <FormField label="Date/Time">
          <SpaceBetween direction="horizontal" size="s">
            <TimeInput
              onChange={({ detail }) => setSelectedTime(detail.value)}
              value={selectedTime}
              format="hh:mm"
              placeholder="hh:mm"
            />
            <DatePicker onChange={({ detail }) => setSelectedDate(detail.value)} value={selectedDate} />
          </SpaceBetween>
        </FormField>
      </SpaceBetween>
      </Container>
    ),
  };

  const step_select_map = {
    title: "Select Map",
    isOptional: true,
    content: "TODO",
  };

  const step_review = {
    title: "Review & Create",
    content: "TODO",
  };

  const [activeStep, setActiveStep] = useState(0);
  return (
    <Wizard
      onNavigate={({detail}) => setActiveStep(detail.requestedStepIndex)}
      activeStepIndex={activeStep}
      submitButtonText="Create Match"
      allowSkipTo
      steps={[
        step_select_opponents,
        step_configure_scheduling,
        step_select_map,
        step_review
      ]}
      i18nStrings={{
        cancelButton: "Cancel",
        nextButton: "Next",
        previousButton: "Back",
        optional: "optional",
        stepNumberLabel: stepNumber => `Step ${stepNumber}`,
        skipToButtonLabel: (step, stepNumber) => `Skip to ${step.title}`
      }}
      />
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
          <NewMatchForm />
      ) ||

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
    }
    </>
  );
}
