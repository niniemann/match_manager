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
} from "@cloudscape-design/components";

import axios from "axios";

import { CriticalConfirmationDialog } from "../../components/Dialogs";
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

function TeamEditForm({ team, onSave, onCancel }) {
  const [name, setName] = useState(team?.name || "");
  const [tag, setTag] = useState(team?.tag || "");
  const [description, setDescription] = useState(team?.description || "");
  const [newLogoFile, setNewLogoFile] = useState(undefined);

  const [submitError, setSubmitError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (team) {
      // when editing an existing team, only forward the changed properties
      let changes = { id: team.id };
      if (name !== team?.name) {
        changes.name = name;
      }
      if (tag !== team?.tag) {
        changes.tag = tag;
      }
      if (description !== team?.description) {
        changes.description = description;
      }

      if (newLogoFile) {
        changes.logo = newLogoFile;
      }

      onSave(changes, setSubmitError);
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

      onSave(newTeam, setSubmitError);
    }
  };

  const hasUnsavedChanges =
    name !== team?.name || tag !== team?.tag || description !== team?.description || newLogoFile;
  return (
    <form onSubmit={handleSubmit}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!hasUnsavedChanges}>
              {team ? "Save" : "Create"}
            </Button>
          </SpaceBetween>
        }
        errorText={submitError}
      >
        <SpaceBetween size="l">
          <FormField label="Name">
            <Input value={name} onChange={(e) => setName(e.detail.value)} />
          </FormField>
          <FormField label="Tag">
            <Input value={tag} onChange={(e) => setTag(e.detail.value)} />
          </FormField>
          <FormField label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.detail.value)} />
          </FormField>
          <FormField label="Logo">
            <ColumnLayout columns={2}>
              {team && (
                <ImageContainer>
                  <StyledImage src={team ? `${API_ENDPOINT}/teams/${team.id}/logo` : ""} />
                </ImageContainer>
              )}
              <FileUpload
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

  const handleSaveTeam = (team, setError) => {
    // make it multipart-form, to allow inclusion of an image
    const data = new FormData();
    for (const key in team) {
      data.append(key, team[key]);
    }

    if (team.id !== undefined) {
      axios
        .patch(`${API_ENDPOINT}/teams/${team.id}`, data, { withCredentials: true })
        .then((result) => {
          setIsTeamFormVisible(false);
          showSuccess(`Saved Team "(id: ${result.data.id}) ${result.data.name}"`);
          updateTeamsTable();
        })
        .catch((error) => {
          console.log(error);
          setError(error.response?.data || error.message);
        });
    } else {
      axios
        .post(`${API_ENDPOINT}/teams/`, data, { withCredentials: true })
        .then((result) => {
          setIsTeamFormVisible(false);
          showSuccess(`Created new team "(id: ${result.data.id}) ${result.data.name}"`);
          updateTeamsTable();
        })
        .catch((error) => {
          console.log(error);
          setError(error.response?.data || error.message);
        });
    }
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
            team={currentTeam}
            onSave={handleSaveTeam}
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

                <div style={{width: "50px", height: "50px", display: "flex"}}>
                  <img style={{width: "100%", height: "auto", objectFit: "contain"}} src={`${API_ENDPOINT}/teams/${item.id}/logo`} />
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
