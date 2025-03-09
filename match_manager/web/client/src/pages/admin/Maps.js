import {
  Box,
  Button,
  ButtonGroup,
  ColumnLayout,
  FileUpload,
  Form,
  FormField,
  Header,
  Input,
  Modal,
  SpaceBetween,
  StatusIndicator,
  Table,
} from "@cloudscape-design/components";
import axios from "axios";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { ApiCallError } from "../../components/Dialogs";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

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

/// edit map data -- if map_id is undefined, creates a new map.
function MapEditForm({ map_id, onCancel, onSuccess }) {
  const isNewMap = map_id === undefined;
  const [oldData, setOldData] = useState({});
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [newImageFile, setNewImageFile] = useState(undefined);
  const [submitError, setSubmitError] = useState("");

  const hasUnsavedChanges =
    shortName !== oldData?.short_name ||
    fullName !== oldData?.full_name ||
    newImageFile;

  useEffect(() => {
    if (!isNewMap) {
      axios.get(`${API_ENDPOINT}/maps/${map_id}`).then(({ data }) => {
        setOldData(data);
        setShortName(data.short_name);
        setFullName(data.full_name);
        // TODO image
      });
    } else {
        setOldData({});
        setShortName("");
        setFullName("");
    }
  }, [map_id]);


  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isNewMap) {
        // patch existing map
        let changes = {};
        if (shortName !== oldData?.short_name) {
            changes.short_name = shortName;
        }
        if (fullName !== oldData?.full_name) {
            changes.full_name = fullName;
        }
        if (newImageFile) {
            changes.image = newImageFile;
        }

        // make it a multipart-form, to allow inclusion of the image
        let data = new FormData();
        for (const key in changes) {
            data.append(key, changes[key]);
        }

        axios
          .patch(`${API_ENDPOINT}/maps/${map_id}`, data, { withCredentials: true })
          .then((result) => {
            onSuccess();
          })
          .catch((error) => {
            setSubmitError(error.response?.data || error.message);
          });
    } else {
        // create a new map
        let newMap = {
            short_name: shortName,
            full_name: fullName,
        };
        if (newImageFile) {
            newMap.image = newImageFile;
        }

        let data = new FormData();
        for (const key in newMap) {
            data.append(key, newMap[key]);
        }

        axios
          .post(`${API_ENDPOINT}/maps`, data, { withCredentials: true })
          .then((result) => {
            onSuccess();
          })
          .catch((error) => {
            setSubmitError(error.response?.data || error.message);
          });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!hasUnsavedChanges}>
              {isNewMap ? "Create" : "Save"}
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <FormField label="Short Name">
            <Input value={shortName} onChange={({detail}) => setShortName(detail.value) } />
          </FormField>
          <FormField label="Full Name">
            <Input value={fullName} onChange={({detail}) => setFullName(detail.value) } />
          </FormField>
          <FormField label="Image">
            <ColumnLayout columns={2}>
              {oldData.image_filename && (
                <ImageContainer>
                  <StyledImage src={`${API_ENDPOINT}/maps/image/${oldData.image_filename}`} />
                </ImageContainer>
              )}
              <FileUpload
                value={newImageFile ? [newImageFile] : []}
                onChange={({detail}) => {
                    setNewImageFile(detail.value.length > 0 ? detail.value[0] : undefined);
                }}

                showFileThumbnail
                accept={["image/png", "image/jpeg", "image/webp"]}
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

export function MapTable() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(false);

  const [mapToEdit, setMapToEdit] = useState(undefined);
  const [mapEditVisible, setMapEditVisible] = useState(false);

  const openModalToCreate = () => {
    setMapToEdit(undefined);
    setMapEditVisible(true);
  };

  const openModalToEdit = (map_id) => {
    setMapToEdit(map_id);
    setMapEditVisible(true);
  };

  const refetchMaps = () => {
    setLoading(true);
    axios
      .get(`${API_ENDPOINT}/maps`)
      .then(({ data }) => setMaps(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refetchMaps();
  }, []);

  const columns = [
    { id: "map_id", header: "Id", cell: (item) => item.id },
    { id: "has_image", header: "Image",
        cell: (item) => {
            if (item.image_filename) {
                return (<StatusIndicator type="success" />);
            }
            return (<StatusIndicator type="error" />);
        }
    },
    { id: "short_name", header: "Short Name", cell: (item) => item.short_name },
    { id: "full_name", header: "Full Name", cell: (item) => item.full_name },
    {
      id: "actions",
      header: null,
      cell: (item) => (
        <>
          <ButtonGroup
            items={[
              {
                type: "icon-button",
                id: "edit",
                iconName: "edit",
                text: "Edit",
              },
            ]}
            onItemClick={({ detail }) => {
                // there is only one action, so it *must* be the edit button.
                openModalToEdit(item.id);
            }}
          />
        </>
      ),
    },
  ];
  return (
    <>
      {mapEditVisible && (
        <Modal
          visible={mapEditVisible}
          onDismiss={() => setMapEditVisible(false)}
          header={mapToEdit ? "Edit Map" : "Create Map"}
        >
          <MapEditForm
            map_id={mapToEdit}
            onCancel={() => setMapEditVisible(false)}
            onSuccess={() => {
              // TODO showSuccess?
              refetchMaps();
              setMapEditVisible(false);
            }}
          />
        </Modal>
      )}
      <Table
        header={
          <Header
            description="Manage all available maps here. New update? Just add an entry!"
            actions={
              <Button variant="primary" onClick={openModalToCreate}>
                Create Map
              </Button>
            }
          >
            Maps
          </Header>
        }
        columnDefinitions={columns}
        variant="full-page"
        loadingText="Loading maps"
        loading={loading}
        empty={<p>Nothing to see here.</p>}
        items={maps}
      />
    </>
  );
}
