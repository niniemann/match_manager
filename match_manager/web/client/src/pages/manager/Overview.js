import { Container, Header } from "@cloudscape-design/components";
import { useTeam } from "../../hooks/useTeams";

export function TeamOverview({team_id}) {
    const { data: team } = useTeam(team_id);

    return (<Container header={<Header>Overview for {team.name}</Header>}>
        TODO. How to organize this?
        <ul>
            <li>Scheduling activity -- dates to confirm, suggestions to make</li>
            <li>Map ban activitys -- my turn? waiting for opponent?</li>
            <li>Results to submit / confirm</li>
        </ul>
    </Container>);
}
