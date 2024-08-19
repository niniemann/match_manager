import { useState, useEffect } from "react";
import { Table, Button, Header, Alert } from "@cloudscape-design/components";

import axios from "axios";

import { CriticalConfirmationDialog } from "../../components/Dialogs";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

/// get the list of all teams
function getTeams() {
  return axios.get(`${API_ENDPOINT}/teams`);
}

/// remove a single team, by id
function removeTeam(team_id) {
  return axios.delete(`${API_ENDPOINT}/teams/${team_id}`, { withCredentials: true });
}

/// button that deletes the associated team
function DeleteTeamButton({ team, onTeamDeleted }) {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Button variant="link" onClick={() => setModalVisible(true)}>
        Delete
      </Button>
      <CriticalConfirmationDialog
        header={`Delete ${team.name}?`}
        visible={isModalVisible}
        onDismiss={() => setModalVisible(false)}
        onConfirm={() => {
          removeTeam(team.id).then(onTeamDeleted);
          setModalVisible(false);
        }}
        confirmationText={team.name}
      >
        <Alert type="warning">
          You are about to completely remove "{team.name}". This will also affect previous seasons/tournaments. Removing
          a team is usually not necessary, as they can be associated with a season separately.
        </Alert>
      </CriticalConfirmationDialog>
    </>
  );
}

export function TeamsTable() {
  const [items, setItems] = useState(undefined);

  /// get the list of all teams, and update the entries in the table
  const updateTeamsTable = async () => {
    return await getTeams().then((r) => setItems(r.data));
  };

  /// only once when loading the teams table: fetch and display the data
  useEffect(() => {
    updateTeamsTable();
  }, []);

  return (
    <Table
      columnDefinitions={[
        {
          id: "team_id",
          header: "Team Id",
          cell: (item) => item.id,
          isRowHeader: true,
        },
        {
          id: "name",
          header: "Full Name",
          cell: (item) => item.name,
        },
        {
          id: "actions",
          header: "Actions",
          cell: (item) => <DeleteTeamButton team={item} onTeamDeleted={updateTeamsTable} />,
        },
      ]}
      items={items}
      trackBy="id"
      empty={<p>Nothing to see here.</p>}
      header={
        <Header description="Not just for the current season!" actions={<Button variant="primary">Create Team</Button>}>
          All Teams
        </Header>
      }
      variant="full-page"
      loadingText="Loading teams"
      loading={items === undefined}
    />
  );
}
