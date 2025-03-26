import { Button, ButtonGroup, Header, SpaceBetween, StatusIndicator, Table } from "@cloudscape-design/components";
import { useTeamLookup } from "../../hooks/useTeams";
import { useParams } from "react-router-dom";
import { useMatchesInPlanning } from "../../hooks/useMatches";
import { useMemo } from "react";
import { DateTimeDisplay } from "../../components/DateTime";
import { toast } from "react-toastify";
import { Avatar, LoadingBar } from "@cloudscape-design/chat-components";

/**
 * @param {Object} param0
 * @param {*} param0.team the id of the team being managed
 * @param {*} param0.matches the matches it participates in which may need planning input
 */
function InPlanningTable({ team, matches }) {
  const { data: teams } = useTeamLookup();

  // --- helpers to deal with different scheduling states ---
  const set_by_admin = (match) => match.match_time_state === "FIXED" && match.match_time;
  const waiting_for_admin = (match) => match.match_time_state === "FIXED" && !match.match_time;
  const confirmed = (match) => match.match_time_state === "BOTH_CONFIRMED";
  const waiting_for_opponent = (match) =>
    (match.match_time_state === "A_CONFIRMED" && team === match.team_a) ||
    (match.match_time_state === "B_CONFIRMED" && team === match.team_b);
  const needs_suggestion = (match) => match.match_time_state === "OPEN_FOR_SUGGESTIONS";
  const needs_confirmation = (match) =>
    (match.match_time_state === "A_CONFIRMED" && team === match.team_b) ||
    (match.match_time_state === "B_CONFIRMED" && team === match.team_a);
  // --------------------------------------------------------

  const showTeam = (team_id) => (
    <SpaceBetween direction="horizontal" size="s">
      <Avatar imgUrl={teams && teams[team_id]?.logo_url} />
      {(teams && teams[team_id]?.name) || ""}
    </SpaceBetween>
  );

  const matchtime_cell = (match) => {
    return (match.match_time && <DateTimeDisplay timestamp={match.match_time} />);
  };

  const schedule_state_cell = (match) => {
    if (set_by_admin(match)) {
        return (
          <StatusIndicator type="info">
            Fixed by admin.
          </StatusIndicator>
        );
      }

    if (waiting_for_admin(match)) {
      return <StatusIndicator type="pending">Waiting for admin.</StatusIndicator>;
    }

    if (waiting_for_opponent(match)) {
      const other_team_id = team === match.team_a ? match.team_b : match.team_a;
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
    return <ButtonGroup
      items={[
        { id: "confirm", text: "confirm", type: "icon-button", iconName: "check", disabled: !needs_confirmation(match) },
        { id: "reject", text: "reject", type: "icon-button", iconName: "close", disabled: !needs_confirmation(match) },
        { id: "suggest", text: "suggest", type: "icon-button", iconName: "envelope", disabled: !needs_suggestion(match) },
      ]} // TODO: implement. (and make issuing team explicit!)
    />
  }

  const columns = [
    { id: "match_id", header: "Id", cell: (match) => match.id },
    { id: "match_time", header: "Date/Time", cell: matchtime_cell },
    { id: "match_time_state", header: "State", cell: schedule_state_cell },
    { id: "match_time_action", header: "Schedule", cell: schedule_action_cell },
    {
      id: "opponent",
      header: "Opponent",
      cell: (match) => showTeam(team === match.team_a ? match.team_b : match.team_a),
    },
    // TODO: cell for map / link-to-map-ban + "your-turn"-indication
  ];

  return (
    <Table
      header={<Header>In Planning</Header>}
      columnDefinitions={columns}
      items={matches}
      variant="borderless"
      stickyHeader
    />
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
