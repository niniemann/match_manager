import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Header,
  Alert,
  Form,
  SpaceBetween,
  FormField,
  Input,
  Modal,
  Textarea,
  Flashbar,
  Box,
  FileUpload,
  ColumnLayout,
  TokenGroup,
  Select,
} from "@cloudscape-design/components";

import axios from "axios";

import { CriticalConfirmationDialog, ApiCallError } from "../../components/Dialogs";
import styled from "styled-components";

const ImageContainer = styled(Box)`
  width: 100%;
  padding-top: 100%; /* 1:1 aspect ration */
  position: relative;
`;

const StyledImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

/// get the list of all teams
function getTeams() {
  return axios.get(`${API_ENDPOINT}/teams/`);
}

/// remove a single team, by id
function removeTeam(team_id) {
  return axios.delete(`${API_ENDPOINT}/teams/${team_id}`, { withCredentials: true });
}

/// form to either create new teams, or edit existing ones -- admin view, all fields editable
/// if given a team_id, it fetches that teams data (in order to get everything, including extra
/// data that is not retrieved in a call to all-teams, like team-manager information)
function TeamEditForm({ team_id, onSuccess, onCancel }) {
  const isNewTeam = team_id === undefined;
  const [oldTeamData, setOldTeamData] = useState({});
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [newLogoFile, setNewLogoFile] = useState(undefined);

  // managers is the list of rich objects, including names, avatars, ...
  const [managers, setManagers] = useState([]);
  // but to compare if the set of managers changed, and to update them later on,
  // compare the set of managers ids instead -- newManagerIds and managers have to be kept in sync!
  const [oldManagerIds, setOldManagerIds] = useState(new Set());
  const [newManagerIds, setNewManagerIds] = useState(new Set());

  // users to be added as managers are searched -- depending on the server size this may take a sec,
  // so set a loading state
  const [userSearchStatus, setUserSearchStatus] = useState("pending");
  const [userSearchString, setUserSearchString] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);

  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeamData = async () => {
    try {
      const { data } = await axios.get(`${API_ENDPOINT}/teams/${team_id}`);
      console.log(data);
      setOldTeamData(data);
      setName(data.name);
      setTag(data.tag);
      setDescription(data.description);
      setManagers(
        data.managers.map((m) => {
          return {
            label: m.name,
            description: `${m.id}`,
            tags: m.roles,
            iconUrl: m.avatar_url,
            id: m.id,
          };
        })
      );
      setOldManagerIds(new Set(data.managers.map((m) => m.id)));
      setNewManagerIds(new Set(data.managers.map((m) => m.id)));
    } catch (error) {
      setSubmitError(error.response?.data || error.message);
      throw error;
    }
  };

  /// create a new team from the given data
  const createNewTeam = (team) => {
    // make it multipart-form, to allow inclusion of an image
    const data = new FormData();
    for (const key in team) {
      data.append(key, team[key]);
    }

    axios
      .post(`${API_ENDPOINT}/teams/`, data, { withCredentials: true })
      .then((result) => {
        onSuccess(`Created new team "(id: ${result.data.id}) ${result.data.name}"`);
      })
      .catch((error) => {
        console.log(error);
        setSubmitError(error.response?.data || error.message);
      });
  };

  /// edit an existing team with the given data
  const saveExistingTeam = (team) => {
    // make it multipart-form, to allow inclusion of an image
    const data = new FormData();
    for (const key in team) {
      data.append(key, team[key]);
    }

    axios
      .patch(`${API_ENDPOINT}/teams/${team.id}`, data, { withCredentials: true })
      .then((result) => {
        onSuccess(`Saved Team "(id: ${result.data.id}) ${result.data.name}"`);
      })
      .catch((error) => {
        console.log(error);
        setSubmitError(error.response?.data || error.message);
      });
  };

  /// on submit, save or create the team
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isNewTeam) {
      // when editing an existing team, only forward the changed properties
      let changes = { id: team_id };
      if (name !== oldTeamData?.name) {
        changes.name = name;
      }
      if (tag !== oldTeamData?.tag) {
        changes.tag = tag;
      }
      if (description !== oldTeamData?.description) {
        changes.description = description;
      }

      if (newLogoFile) {
        changes.logo = newLogoFile;
      }

      if (oldManagerIds.symmetricDifference(newManagerIds).size > 0) {
        // there are differences in the match managers, send the whole list anew
        changes.managers = [...newManagerIds];
      }

      saveExistingTeam(changes);
    } else {
      // when creating a new team, just forward all data, even empty strings
      let newTeam = {
        name: name,
        tag: tag,
        description: description,
      };

      // but only add a logo if one was set -- prevent sending "undefined"
      if (newLogoFile) {
        newTeam.logo = newLogoFile;
      }

      createNewTeam(newTeam);
    }
  };

  const hasUnsavedChanges =
    name !== oldTeamData?.name ||
    tag !== oldTeamData?.tag ||
    description !== oldTeamData?.description ||
    newLogoFile ||
    oldManagerIds.symmetricDifference(newManagerIds).size > 0;

  useEffect(() => {
    if (!isNewTeam) {
      setIsLoading(true);
      fetchTeamData()
        .then(() => setIsLoading(false))
        .catch((error) => {
          // just to disable the input fields:
          setIsLoading(true);
        });
    } else {
      setIsLoading(false);
    }
  }, [isNewTeam, team_id]);

  return (
    <form onSubmit={handleSubmit}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!hasUnsavedChanges || isLoading}>
              {isNewTeam ? "Create" : "Save"}
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <FormField label="Name">
            <Input value={name} disabled={isLoading} onChange={(e) => setName(e.detail.value)} />
          </FormField>
          <FormField label="Tag">
            <Input value={tag} disabled={isLoading} onChange={(e) => setTag(e.detail.value)} />
          </FormField>
          <FormField label="Description">
            <Textarea value={description} disabled={isLoading} onChange={(e) => setDescription(e.detail.value)} />
          </FormField>
          <FormField label="Team Managers">
            <SpaceBetween size="xs">
              <Select
                filteringType="manual"
                filteringPlaceholder="find user"
                statusType={userSearchStatus}
                placeholder="Add a team manager"
                loadingText="Searching user"
                errorText="Error fetching results"
                recoveryText="Retry"
                finishedText={
                  userSearchString ? `End of results for "${userSearchString}"` : "Please type a name to continue"
                }
                empty="No user found"
                options={userSearchResults}
                onChange={({
                  detail: {
                    selectedOption: { value },
                  },
                }) => {
                  // update id set
                  setNewManagerIds(new Set([...newManagerIds, value.id]));

                  // update visuals
                  setManagers([
                    ...managers,
                    {
                      label: value.name,
                      description: `${value.id}`,
                      tags: value.roles,
                      iconUrl: value.avatar_url,
                      id: value.id,
                    },
                  ]);
                }}
                onLoadItems={({ detail: { filteringText } }) => {
                  setUserSearchString(filteringText);
                  if (filteringText.length > 1) {
                    setUserSearchStatus("loading");
                    axios
                      .get(`${API_ENDPOINT}/user/search`, { params: { user: filteringText } })
                      .then(({ data }) => {
                        setUserSearchResults(
                          data.map((item) => {
                            return {
                              label: item.name,
                              value: item,
                              iconUrl: item.avatar_url,
                              tags: item.roles,
                              description: `${item.id}`,
                            };
                          })
                        );
                        setUserSearchStatus("finished");
                      })
                      .catch(() => {
                        setUserSearchStatus("error");
                      });
                  }
                }}
              />
              <TokenGroup
                onDismiss={({ detail: { itemIndex } }) => {
                  // set visuals
                  const managers_updated = [...managers.slice(0, itemIndex), ...managers.slice(itemIndex + 1)];
                  setManagers(managers_updated);

                  // set ids to store
                  setNewManagerIds(new Set(managers_updated.map((m) => m.id)));
                }}
                items={managers}
              />
            </SpaceBetween>
          </FormField>
          <FormField label="Logo">
            <ColumnLayout columns={2}>
              {!isNewTeam && (
                <ImageContainer>
                  <StyledImage src={isNewTeam ? "" : `${API_ENDPOINT}/teams/${team_id}/logo`} />
                </ImageContainer>
              )}
              <FileUpload
                disabled={isLoading}
                onChange={({ detail }) => {
                  console.log(detail);
                  setNewLogoFile(detail.value.length > 0 ? detail.value[0] : undefined);
                }}
                value={newLogoFile ? [newLogoFile] : []}
                showFileThumbnail
                accept="image/png"
                i18nStrings={{
                  uploadButtonText: (_) => "Choose file",
                  dropzoneText: (_) => "Drop file to upload",
                  removeFileAriaLabel: (_) => "Remove file",
                  limitShowFewer: (_) => "Show fewer files",
                  limitShowMore: (_) => "Show more files",
                  errorIconAriaLabel: (_) => "Error",
                }}
              />
            </ColumnLayout>
          </FormField>
          {submitError && <ApiCallError error={submitError} />}
        </SpaceBetween>
      </Form>
    </form>
  );
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
  const [isTeamFormVisible, setIsTeamFormVisible] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(null);

  const [notificationItems, setNotificationItems] = useState([]);
  const showError = (text) => {
    setNotificationItems([
      {
        type: "error",
        content: text,
        dismissible: true,
        onDismiss: () => setNotificationItems([]),
      },
    ]);
  };

  const showSuccess = (text) => {
    setNotificationItems([
      {
        type: "success",
        content: text,
        dismissible: true,
        onDismiss: () => setNotificationItems([]),
      },
    ]);
  };

  /// get the list of all teams, and update the entries in the table
  const updateTeamsTable = async () => {
    return await getTeams().then((r) => setItems(r.data));
  };

  const openModalToCreate = () => {
    setCurrentTeam(null);
    setIsTeamFormVisible(true);
  };

  const openModalToEdit = (team) => {
    setCurrentTeam(team);
    setIsTeamFormVisible(true);
  };

  /// only once when loading the teams table: fetch and display the data
  useEffect(() => {
    updateTeamsTable();
  }, []);

  return (
    <>
      {isTeamFormVisible && (
        <Modal
          onDismiss={() => setIsTeamFormVisible(false)}
          visible={isTeamFormVisible}
          header={currentTeam ? "Edit Team" : "Create Team"}
        >
          <TeamEditForm
            team_id={currentTeam?.id}
            onSuccess={(msg) => {
              showSuccess(msg);
              updateTeamsTable();
              setIsTeamFormVisible(false);
            }}
            onCancel={() => {
              setIsTeamFormVisible(false);
            }}
          />
        </Modal>
      )}
      <SpaceBetween size="xl">
        <Flashbar items={notificationItems} />

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
              header: "Full Name",
              cell: (item) => item.name,
            },
            {
              id: "actions",
              header: "Actions",
              cell: (item) => (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      openModalToEdit(item);
                    }}
                  >
                    Edit
                  </Button>{" "}
                  <DeleteTeamButton
                    team={item}
                    onTeamDeleted={() => {
                      showError(`Deleted Team: ${item.name}`);
                      updateTeamsTable();
                    }}
                  />
                </>
              ),
            },
          ]}
          items={items}
          trackBy="id"
          empty={<p>Nothing to see here.</p>}
          header={
            <Header
              description="Not just for the current season!"
              actions={
                <Button variant="primary" onClick={openModalToCreate}>
                  Create Team
                </Button>
              }
            >
              All Teams
            </Header>
          }
          variant="full-page"
          loadingText="Loading teams"
          loading={items === undefined}
        />
      </SpaceBetween>
    </>
  );
}
