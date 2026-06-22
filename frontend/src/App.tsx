import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Transfer from "./pages/Transfer";
import History from "./pages/History";
import BottomNav from "./components/layout/BottomNav";
import RequireAuth from "./components/layout/RequireAuth";

// 모바일 앱쉘(고정폭+그림자) 없이 전체 너비를 쓰는 페이지들.
// 데스크탑에서는 일반 웹사이트처럼, 모바일에서는 풀스크린으로 보여준다.
const FULL_WIDTH_PATHS = ["/", "/login", "/signup"];

function Shell() {
  const location = useLocation();
  const isFullWidth = FULL_WIDTH_PATHS.includes(location.pathname);
  const hideNav = isFullWidth;

  return (
    <div className={isFullWidth ? "app-shell app-shell--full" : "app-shell"}>
      <div className="app-content" style={{ paddingBottom: hideNav ? 0 : 64 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/home"
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
                <Chat />
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