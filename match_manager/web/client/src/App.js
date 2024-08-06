import "./App.css";
import Navbar from "./Navbar.js";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.js";
import Teams from "./pages/Teams.js";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teams" element={<Teams />} />
      </Routes>
    </>
  );
}

export default App;
