import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface Props {
  /** 페이지 제목. 없으면 로고만 보여준다 (랜딩/대시보드처럼 제목이 따로 있는 화면용) */
  title?: string;
  /** true면 뒤로가기 버튼을 숨긴다 (예: 최초 진입 화면) */
  hideBack?: boolean;
}

/**
 * 모든 페이지에서 공통으로 쓰는 상단 헤더.
 * - 뒤로가기: 브라우저 히스토리로 이전 화면 이동. 더 갈 곳이 없으면 로고와 같은 곳으로 이동한다.
 * - 로고: 로그인 상태면 /home(대시보드)으로, 비로그인 상태면 /(첫 화면)으로 이동한다.
 */
export default function PageHeader({ title, hideBack }: Props) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const homeDest = isAuthenticated ? "/home" : "/";

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homeDest);
    }
  };

  const handleLogoClick = () => navigate(homeDest);

  return (
    <header className="page-header">
      {!hideBack ? (
        <button className="page-header__back" onClick={handleBack} aria-label="이전 화면으로">
          ←
        </button>
      ) : (
        <span className="page-header__spacer" />
      )}

      <button className="page-header__brand" onClick={handleLogoClick} aria-label="LeeBank 메인으로 이동">
        <span className="page-header__brand-mark">B</span>
        {title ? (
          <span className="page-header__title">{title}</span>
        ) : (
          <span className="page-header__brand-name">LeeBank</span>
        )}
      </button>

      <span className="page-header__spacer" />
    </header>
  );
}