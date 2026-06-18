import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface Props {
  children: React.ReactNode;
}

/**
 * 로그인하지 않은 사용자가 보호된 페이지(메인/이체/내역/채팅)에 접근하면
 * 로그인 페이지로 돌려보낸다.
 */
export default function RequireAuth({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
