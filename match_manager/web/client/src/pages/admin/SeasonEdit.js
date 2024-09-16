import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  ButtonDropdown,
  Cards,
  Form,
  Header,
  Input,
  Modal,
  SpaceBetween,
  Table,
} from "@cloudscape-design/components";
import { useParams } from "react-router-dom";
import { CriticalConfirmationDialog } from "../../components/Dialogs";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function GroupEdit({ group }) {
  const [unusedTeams, setUnusedTeams] = useState([]);
  const [teamsInGroup, setTeamsInGroup] = useState(group.teams);

  useEffect(() => {
    /* TODO */
  }, [setUnusedTeams, setTeamsInGroup]);

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
          id: "logo",
          header: "Logo",
          cell: (item) => (
            <div style={{ width: "50px", height: "50px", display: "flex" }}>
              <img
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
                src={`${API_ENDPOINT}/teams/${item.id}/logo`}
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
          cell: (item) => <Button variant="icon" iconName="remove"></Button>,
        },
      ]}
      items={group.teams}
      trackBy="id"
      empty={<p>Nothing to see here.</p>}
      variant="embedded"
    ></Table>
  );
}

function NewGroupModal({ targetSeasonId, onSuccess, onDismiss }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [creationInProgress, setCreationInProgress] = useState(false);

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
      .catch((e) => alert(e))
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
      <Input value={newGroupName} onChange={({ detail }) => setNewGroupName(detail.value)}></Input>
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

export function SeasonEdit() {
  const { seasonId } = useParams();
  const [groups, setGroups] = useState([]);
  const [seasonName, setSeasonName] = useState("");
  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

  // to force a reload after model data change, e.g after creating or deleting a group
  const [reloadSeed, setReloadSeed] = useState(0);

  // used as state for the single "Delete Group?" modal
  const [groupToDelete, setGroupToDelete] = useState(undefined);

  useEffect(() => {
    const fetchData = async () => {
      axios
        .get(`${API_ENDPOINT}/seasons/${seasonId}`)
        .then(({ data }) => {
          setGroups(data.match_groups);
          setSeasonName(data.name);
        })
        .catch((e) => alert(JSON.stringify(e)));
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
            axios.delete(`${API_ENDPOINT}/seasons/groups/${groupToDelete.id}`, { withCredentials: true }).then(() => {
              setGroupToDelete(undefined);
              setReloadSeed(reloadSeed + 1);
            }).catch(alert);
          }}
        />
      )}
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
                  } else if (id == "mv") {
                    // TODO: rename group
                  }
                }}
                variant="inline-icon"
              />
            </div>
          ),
          sections: [
            {
              id: "teams",
              content: (item) => <GroupEdit group={item} /> /*TODO*/,
            },
          ],
        }}
        cardsPerRow={[{ cards: 1 }, { minWidth: 800, cards: 2 }]}
        items={groups}
      ></Cards>
    </>
  );
}
