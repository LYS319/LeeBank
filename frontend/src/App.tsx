import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Transfer from "./pages/Transfer";
import History from "./pages/History";
import BottomNav from "./components/layout/BottomNav";
import RequireAuth from "./components/layout/RequireAuth";

function Shell() {
  const location = useLocation();
  const hideNav = location.pathname === "/login";

  return (
    <div className="app-shell">
      <div className="app-content" style={{ paddingBottom: hideNav ? 0 : 64 }}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/transfer"
            element={
              <RequireAuth>
                <Transfer />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

export default App;
