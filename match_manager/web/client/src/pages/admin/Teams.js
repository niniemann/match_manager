import { useState, useEffect } from "react";
import { Table, Button, Header } from "@cloudscape-design/components";

import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export function TeamsTable() {
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    const getTeams = async () => {
      const response = await axios.get(`${API_ENDPOINT}/teams`);
      setItems(response.data);
    };

    getTeams();
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
          cell: (item) => <Button variant="normal">Delete</Button>,
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
