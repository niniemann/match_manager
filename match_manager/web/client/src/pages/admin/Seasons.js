import { useEffect, useState } from "react";
import { Button, Form, FormField, Header, Modal, Table, SpaceBetween, Input } from "@cloudscape-design/components";

import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

function NewSeasonForm({ onCancel, onSubmit }) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
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
        <FormField label="Name">
          <Input value={name} onChange={({ detail }) => setName(detail.value)} />
        </FormField>
      </Form>
    </form>
  );
}

export function SeasonsTable() {
  const [seasons, setSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSeason, setShowCreateSeason] = useState(false);

  useEffect(() => {
    const fetch_seasons = () => {
      axios
        .get(`${API_ENDPOINT}/seasons`)
        .then(({ data }) => setSeasons(data))
        .finally(() => setIsLoading(false));
    };

    fetch_seasons();
  }, []);

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
          <NewSeasonForm onCancel={() => setShowCreateSeason(false)} onSubmit={(e) => alert(JSON.stringify(e.detail))} />
        </Modal>
      )}

      <Table
        columnDefinitions={[
          { id: "season_id", header: "Season", cell: (item) => item.id, isRowHeader: true },
          {
            id: "name",
            header: "Name",
            cell: (item) => item.name,
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
    </>
  );
}
