import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  ButtonDropdown,
  Cards,
  FormField,
  Header,
  Input,
  Modal,
  Select,
  SpaceBetween,
  Table,
} from "@cloudscape-design/components";
import { useParams } from "react-router-dom";
import { ApiCallError, CriticalConfirmationDialog } from "../../components/Dialogs";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function GroupEdit({ group, allTeams }) {
  const [unusedTeams, setUnusedTeams] = useState([]);
  const [teamsInGroup, setTeamsInGroup] = useState(group.teams);

  useEffect(() => {
    // update the selection of teams that are not within this group yet
    setUnusedTeams(allTeams.filter((team) => !teamsInGroup.some((used) => used.id === team.id)));
  }, [allTeams, teamsInGroup]);

  return (
    <>
      <Table
        columnDefinitions={[
          {
            id: "team_id",
            header: "Team Id",
            cell: (item) => item.id,
            isRowHeader: true,
          },
          {
            id: "logo",
            header: "Logo",
            cell: (item) => (
              <div style={{ width: "50px", height: "50px", display: "flex" }}>
                <img
                  style={{ width: "100%", height: "auto", objectFit: "contain" }}
                  src={`${API_ENDPOINT}/teams/logo/${item.logo_filename}`}
                />
              </div>
            ),
          },
          {
            id: "name",
            header: "Name",
            cell: (item) => item.name,
          },
          {
            id: "actions",
            header: "Actions",
            cell: (item) => (
              <Button
                variant="icon"
                iconName="remove"
                onClick={() => {
                  // remove the team from the group -- this is not a critical action as it can be reverted,
                  // so no confirmation is asked (for now)
                  const newTeamsList = teamsInGroup.filter((team) => team.id !== item.id);
                  axios
                    .patch(
                      `${API_ENDPOINT}/seasons/groups/${group.id}`,
                      {
                        teams: newTeamsList.map((team) => team.id),
                      },
                      { withCredentials: true }
                    )
                    .then(({ data }) => setTeamsInGroup(data.teams))
                    .catch(alert); // TODO: error handling
                }}
              />
            ),
          },
        ]}
        items={teamsInGroup}
        trackBy="id"
        empty={<p>Nothing to see here.</p>}
        variant="embedded"
      />
      <Select
        options={unusedTeams.map((team) => {
          return {
            label: team.tag,
            description: team.name,
            iconUrl: `${API_ENDPOINT}/teams/logo/${team.logo_filename}`,
            team: team,
          };
        })}
        filteringType="auto"
        placeholder="Add a team"
        onChange={({ detail: { selectedOption } }) => {
          const newTeamsList = [...teamsInGroup, selectedOption.team];
          axios
            .patch(
              `${API_ENDPOINT}/seasons/groups/${group.id}`,
              {
                teams: newTeamsList.map((team) => team.id),
              },
              { withCredentials: true }
            )
            .then(({ data }) => setTeamsInGroup(data.teams))
            .catch(alert); // TODO: error handling
        }}
      />
    </>
  );
}

function NewGroupModal({ targetSeasonId, onSuccess, onDismiss }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [creationInProgress, setCreationInProgress] = useState(false);
  const [currentError, setCurrentError] = useState(undefined);

  const createNewGroup = () => {
    if (creationInProgress) return;
    setCreationInProgress(true);

    axios
      .post(
        `${API_ENDPOINT}/seasons/groups`,
        {
          season_id: targetSeasonId,
          name: newGroupName,
        },
        { withCredentials: true }
      )
      .then(onSuccess)
      .catch((e) => setCurrentError(e.response?.data || e.message))
      .finally(() => setCreationInProgress(false));
  };

  return (
    <Modal
      onDismiss={() => {
        onDismiss();
      }}
      visible={true}
      header={"Create Group"}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={onDismiss} variant="link">
              Cancel
            </Button>
            <Button variant="primary" onClick={createNewGroup}>
              Confirm
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {currentError && <ApiCallError error={currentError} />}
        <FormField label="Name">
          <Input value={newGroupName} onChange={({ detail }) => setNewGroupName(detail.value)}></Input>
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}

function DeleteGroupModal({ group, onConfirm, onDismiss }) {
  return (
    <CriticalConfirmationDialog
      visible={true}
      header={`Delete ${group.name}?`}
      onDismiss={onDismiss}
      onConfirm={onConfirm}
    >
      <Alert type="warning">
        You are about to completely remove "{group.name}". Are you absolutly sure? This should only be required if you
        created a new group by accident.
        <p>
          <i>It might even fail if there are teams and/or matches in this group, not sure how I'll implement it.</i>
        </p>
      </Alert>
    </CriticalConfirmationDialog>
  );
}

function RenameGroupModal({ group, onConfirm, onDismiss }) {
  const [newName, setNewName] = useState("");

  return (
    <CriticalConfirmationDialog
      visible={true}
      header={`Rename ${group.name}?`}
      onDismiss={onDismiss}
      onConfirm={() => onConfirm(newName)}
    >
      <FormField label="New Name">
        <Input value={newName} placeholder={group.name} onChange={({ detail }) => setNewName(detail.value)} />
      </FormField>
    </CriticalConfirmationDialog>
  );
}

export function SeasonEdit() {
  const { seasonId } = useParams();
  const [groups, setGroups] = useState([]);
  const [seasonName, setSeasonName] = useState("");
  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

  // used for drop-down selection to add new teams to a group
  const [allTeams, setAllTeams] = useState([]);

  // to force a reload after model data change, e.g after creating or deleting a group
  const [reloadSeed, setReloadSeed] = useState(0);

  // used as state for the single "Delete Group?" modal
  const [groupToDelete, setGroupToDelete] = useState(undefined);

  // used as state for the single "Rename Group?" modal
  const [groupToRename, setGroupToRename] = useState(undefined);

  // display the latest error that occurred
  const [currentError, setCurrentError] = useState(undefined);

  useEffect(() => {
    const fetchData = async () => {
      axios
        .get(`${API_ENDPOINT}/seasons/${seasonId}`)
        .then(({ data }) => {
          setGroups(data.match_groups);
          setSeasonName(data.name);
        })
        .catch((e) => setCurrentError(e.response?.data || e.message));

      axios
        .get(`${API_ENDPOINT}/teams`)
        .then(({ data }) => {
          setAllTeams(data);
        })
        .catch((e) => setCurrentError(e.response?.data || e.message));
    };

    fetchData();
  }, [seasonId, reloadSeed]);

  return (
    <>
      {isCreateGroupVisible && (
        <NewGroupModal
          targetSeasonId={seasonId}
          onDismiss={() => setIsCreateGroupVisible(false)}
          onSuccess={() => {
            setIsCreateGroupVisible(false);
            setReloadSeed(reloadSeed + 1);
          }}
        />
      )}
      {groupToDelete !== undefined && (
        <DeleteGroupModal
          group={groupToDelete}
          onDismiss={() => setGroupToDelete(undefined)}
          onConfirm={() => {
            axios
              .delete(`${API_ENDPOINT}/seasons/groups/${groupToDelete.id}`, { withCredentials: true })
              .then(() => {
                setCurrentError(undefined);
                setReloadSeed(reloadSeed + 1);
              })
              .catch((error) => {
                setCurrentError(error.response?.data || error.message);
              })
              .finally(() => setGroupToDelete(undefined));
          }}
        />
      )}
      {groupToRename !== undefined && (
        <RenameGroupModal
          group={groupToRename}
          onDismiss={() => setGroupToRename(undefined)}
          onConfirm={(newName) => {
            axios
              .patch(
                `${API_ENDPOINT}/seasons/groups/${groupToRename.id}`,
                {
                  name: newName,
                },
                { withCredentials: true }
              )
              .then(() => {
                setCurrentError(undefined);
                setReloadSeed(reloadSeed + 1);
              })
              .catch((error) => setCurrentError(error.response?.data || error.message))
              .finally(() => setGroupToRename(undefined));
          }}
        />
      )}

      <SpaceBetween size="m">
        {currentError !== undefined && <ApiCallError error={currentError} />}

        <Cards
          header={
            <Header
              actions={
                <Button
                  onClick={() => {
                    setIsCreateGroupVisible(true);
                  }}
                  variant="primary"
                >
                  Create Group
                </Button>
              }
            >
              Groups within Season "{seasonName}"
            </Header>
          }
          cardDefinition={{
            header: (item) => (
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                <span>{item.name}</span>
                <ButtonDropdown
                  items={[
                    {
                      text: "Delete",
                      id: "rm",
                      disabled: false,
                    },
                    { text: "Rename", id: "mv", disabled: false },
                  ]}
                  onItemClick={({ detail: { id } }) => {
                    if (id === "rm") {
                      // remove group
                      setGroupToDelete(item);
                    } else if (id === "mv") {
                      // rename group
                      setGroupToRename(item);
                    }
                  }}
                  variant="inline-icon"
                />
              </div>
            ),
            sections: [
              {
                id: "teams",
                content: (item) => <GroupEdit group={item} allTeams={allTeams} />,
              },
            ],
          }}
          cardsPerRow={[{ cards: 1 }, { minWidth: 800, cards: 2 }]}
          items={groups}
          trackBy="id"
        />
      </SpaceBetween>
    </>
  );
}
