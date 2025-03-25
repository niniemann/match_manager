import { Button, SpaceBetween, StatusIndicator, Table } from "@cloudscape-design/components";
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

  const showTeam = (team_id) => <SpaceBetween direction="horizontal" size="s"><Avatar imgUrl={teams && teams[team_id]?.logo_url} />{(teams && teams[team_id]?.name) || ""}</SpaceBetween>;

  const schedule_cell = (match) => {
    const isFixed = match.match_time_state === "FIXED" || match.match_time_state === "BOTH_CONFIRMED";
    const waiting_for_other_team =
      (match.match_time_state === "A_CONFIRMED" && team === match.team_b) ||
      (match.match_time_state === "B_CONFIRMED" && team === match.team_a);

    if (isFixed) {
      return match.match_time && <StatusIndicator type="success" colorOverride="grey"><DateTimeDisplay timestamp={match.match_time} /></StatusIndicator>;
    }

    if (waiting_for_other_team) {
      return (
        <StatusIndicator type="in-progress">
          <DateTimeDisplay timestamp={match.match_time} />
        </StatusIndicator>
      );
    }

    // else: we must provide input. --> show button to open date/time modal
    return (
      <>
        {match.match_time && <StatusIndicator type="warning"><DateTimeDisplay timestamp={match.match_time} /></StatusIndicator>}
        <Button
          variant="icon"
          iconName="edit"
          onClick={() => toast.info("TODO: open confirm/suggest date/time modal")}
        />
      </>
    );
  };

  const columns = [
    { id: "match_id", header: "Id", cell: (match) => match.id },
    { id: "match_time", header: "Date/Time", cell: schedule_cell },
    { id: "team_a", header: "Team A", cell: (match) => showTeam(match.team_a) },
    { id: "team_b", header: "Team B", cell: (match) => showTeam(match.team_b) },
  ];

  return <Table columnDefinitions={columns} items={matches} />;
}

export function TeamManagerOpenTasks() {
  const { teamId } = useParams();
  const teamIdInt = +teamId;

  const { data: allMatchesInPlanning, isLoading: loadingMatches } = useMatchesInPlanning();

  const matchesInPlanning = useMemo(() => {
    return allMatchesInPlanning?.filter((m) => m.team_a === teamIdInt || m.team_b === teamIdInt);
  }, [teamIdInt, allMatchesInPlanning]);

  if (loadingMatches) return <LoadingBar variant="gen-ai-masked" />;
  return <InPlanningTable team={teamIdInt} matches={matchesInPlanning} />;
}
