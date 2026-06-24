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

// 로그인 전 화면 (네비게이션 바를 보여주지 않는다)
const AUTH_PATHS = ["/", "/login", "/signup"];

// 모바일: 모든 페이지가 항상 480px 앱 프레임처럼 보인다 (app-shell이 미디어쿼리로 처리).
// 데스크탑: 모든 페이지가 전체 너비를 쓰는 일반 웹사이트처럼 보인다.
function Shell() {
  const location = useLocation();
  const hideNav = AUTH_PATHS.includes(location.pathname);

  return (
    <div className="app-shell">
      <div
        className={hideNav ? "app-content" : "app-content app-content--boxed"}
        style={{ paddingBottom: hideNav ? 0 : undefined }}
      >
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