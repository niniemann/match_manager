import { NavLink } from "react-router-dom";

function MenuSection({ name, children }) {
  return (
    <div>
      <hr className="my-2" />
      <h3>{name}</h3>
      {children}
    </div>
  );
}

function MenuItem({ name, href }) {
  return (
    <NavLink
      key={name}
      to={href}
      role="button"
      className={[
        "flex items-center w-full p-2 leading-tight transition-all rounded-lg",
        "outline-none text-start hover:bg-slate-50 hover:bg-opacity-80",
        "hover:text-slate-900 focus:bg-slate-50 focus:bg-opacity-80 focus:text-slate-900",
        "active:bg-slate-50 active:bg-opacity-80 active:text-slate-900",
      ].join(" ")}
    >
      {name}
    </NavLink>
  );
}

export default function SideMenu() {
  return (
    <>
      <aside className="bg-gray-800 text-white w-64 h-full p-4 sticky">
        <nav>
          <MenuSection name="Admin">
            <MenuItem name="All Teams" href="all-teams" />
            <MenuItem name="Audit-Log" />
          </MenuSection>

          {/*
          <MenuSection name="team.phoenix">
            <MenuItem name="match-orga" />
            <MenuItem name="roaster" />
          </MenuSection>
          */}
        </nav>
      </aside>
    </>
  );
}
