import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Transfer from "./pages/Transfer";
import History from "./pages/History";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;