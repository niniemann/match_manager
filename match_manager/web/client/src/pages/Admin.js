import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { AppLayout, ContentLayout, SideNavigation } from "@cloudscape-design/components";

import Teams from "./admin/Teams.js";

export default function Admin() {
  const navigate = useNavigate();

  const [activeHref, setActiveHref] = useState("");

  return (
    <AppLayout
      navigation=<SideNavigation
        activeHref={activeHref}
        onFollow={(event) => {
          if (!event.detail.external) {
            event.preventDefault();
            setActiveHref(event.detail.href);
            navigate(event.detail.href);
          }
        }}
        items={[
          { type: "link", text: "All Teams", href: "all-teams" },
          { type: "link", text: "Audit Log", href: "audit-log" },
        ]}
      />
      content=<Routes>
        <Route path="all-teams" element={<Teams />} />
        <Route path="audit-log" element={<></>} />
      </Routes>
    />
  );
}
