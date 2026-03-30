import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Host from "./pages/Host";
import Guest from "./pages/Guest";
import Chart from "./pages/Chart";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:code" element={<Host />} />
        <Route path="/chart/:code" element={<Chart />} />
        <Route path="/:code" element={<Guest />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
