import { useEffect, useState } from "react";
import {
  Button,
  Form,
  FormField,
  Header,
  Modal,
  Table,
  SpaceBetween,
  Input,
  Link,
  Flashbar,
} from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

import axios from "axios";
import { ApiCallError } from "../../components/Dialogs";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function NewSeasonForm({ onCancel, onSuccess }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        axios
          .post(`${API_ENDPOINT}/seasons/`, { name: name }, { withCredentials: true })
          .then(() => onSuccess(`Created Season "${name}"`))
          .catch((e) => setError(e.response?.data || error.message));
      }}
    >
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              formAction="none"
              variant="link"
              onClick={() => {
                onCancel();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary">Create</Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="s">
          <FormField label="Name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} />
          </FormField>
          {error && <ApiCallError error={error} />}
        </SpaceBetween>
      </Form>
    </form>
  );
}

export function SeasonsTable() {
  const [seasons, setSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSeason, setShowCreateSeason] = useState(false);

  const [reloadSeed, setReloadSeed] = useState(0);
  const triggerReload = () => setReloadSeed(reloadSeed + 1);

  const [notificationItems, setNotificationItems] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetch_seasons = () => {
      setIsLoading(true);
      axios
        .get(`${API_ENDPOINT}/seasons`)
        .then(({ data }) => setSeasons(data))
        .catch((e) =>
          setNotificationItems([
            {
              type: "error",
              content: e.message,
            },
          ])
        )
        .finally(() => setIsLoading(false));
    };

    fetch_seasons();
  }, [reloadSeed]);

  return (
    <>
      {showCreateSeason && (
        <Modal
          visible={showCreateSeason}
          onDismiss={() => {
            setShowCreateSeason(false);
          }}
          header="Create Season"
        >
          <NewSeasonForm
            onCancel={() => setShowCreateSeason(false)}
            onSuccess={(msg) => {
              setNotificationItems([
                {
                  type: "success",
                  content: msg,
                  dismissible: true,
                  onDismiss: () => setNotificationItems([]),
                },
              ]);
              setShowCreateSeason(false);
              triggerReload();
            }}
          />
        </Modal>
      )}

      <SpaceBetween size="s">
        <Flashbar items={notificationItems} />

        <Table
          columnDefinitions={[
            { id: "season_id", header: "Season", cell: (item) => item.id, isRowHeader: true },
            {
              id: "name",
              header: "Name",
              cell: (item) => (
                <Link onClick={() => navigate(`../season/${item.id}`, { relative: "path" })}>{item.name}</Link>
              ),
            },
            {
              id: "number_groups",
              header: "Groups",
              cell: (item) => item.num_groups,
            },
          ]}
          items={seasons}
          trackBy="id"
          empty={<p>Nothing to see here.</p>}
          header={
            <Header
              description="A list of all seasons. Here you can create new ones."
              actions={
                <Button variant="primary" onClick={() => setShowCreateSeason(true)}>
                  Create Season
                </Button>
              }
            >
              Seasons
            </Header>
          }
          variant="full-page"
          loadingText="Loading Seasons"
          loading={isLoading}
        />
      </SpaceBetween>
    </>
  );
}
