import { useState, useEffect, useCallback, useRef } from "react";
import { ColumnLayout, FormField, KeyValuePairs, SpaceBetween, Table, TextFilter } from "@cloudscape-design/components";
import { Avatar } from "@cloudscape-design/chat-components";

import axios from "axios";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

export function AuditLogTable() {
  const [auditEntries, setAuditEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filterText, setFilterText] = useState("");
  // const [oldestLoadedTimestamp, setOldestLoadedTimestamp] = useState(undefined);

  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const observer = useRef(); // observe the end of the list -- load more when scrolling

  const fetchAuditLog = async (before = null) => {
    setLoading(true);
    axios
      .get(`${API_ENDPOINT}/audit/fetch_log`, { params: { timestamp: before }})
      .then(({ data }) => {
        if (before == null) {
            // on first load, just set the list -- avoids duplications in dev mode due to double-executed useEffect
            setAuditEntries(data);
        } else {
            // only append when fetching more, with a given "before"
            setAuditEntries((prevEntries) => [...prevEntries, ...data]);
        }
        if (data.length < 1) {
            setHasMore(false);
        }
      }).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAuditLog();
  }, []);

  useEffect(() => {
    if (filterText) {
        const filtered = auditEntries.filter(entry => {
            return entry.event_type.includes(filterText) ||
                    entry.event_description.includes(filterText) ||
                    entry.author.name.includes(filterText)
            }
        );
        setFilteredEntries(filtered);
        console.log("show filtered by '" + filterText + "'");
    } else {
        setFilteredEntries(auditEntries);
        console.log("show all");
    }
  }, [filterText, auditEntries]);

  const sentinelRef = useCallback((node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
            const lastTimestamp = auditEntries[auditEntries.length - 1].timestamp;
            fetchAuditLog(lastTimestamp);
        }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, auditEntries]);

  const columns = [
    {
        id: "timestamp", header: "Timestamp",
        cell: (item) => new Date(item.timestamp).toLocaleString()
    },
    {
        id: "author", header: "Author",
        cell: (item) => (
            // <ColumnLayout columns={2} borders="vertical">
            <>
                <SpaceBetween direction="horizontal" size="s">
                <Avatar
                    imgUrl={item.author.avatar_url}
                    width={32}
                />
                <FormField
                    label={item.author.name}
                    description={item.author.id}
                />
                </SpaceBetween>
            </>
            //</ColumnLayout>
        )
    },
    {
        id: "type", header: "Type",
        cell: (item) => item.event_type
    },
    { id: "description", header: "Description", cell: (item) => <p style={{whiteSpace: 'normal', wordBreak: 'break-word'}}>{item.event_description}</p> },
  ];

  return (
    <>
      <Table
        columnDefinitions={columns}
        items={filteredEntries}
        sortingDisabled
        stickyHeader
        resizableColumns
        filter={
            <TextFilter
                filteringPlaceholder="search"
                filteringText={filterText}
                onChange={({detail}) => setFilterText(detail.filteringText)}
            />
        }
    />

      {/* sentinel element that triggers loading more entries when visible */}
      <div ref={sentinelRef} style={{ height: '1px'}} />

      {loading && <p>Loading...</p>}
      {!hasMore && <p>No more entries</p>}
    </>
  );
}
