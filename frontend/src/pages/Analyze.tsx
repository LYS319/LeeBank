import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api';

interface Category {
    name: string;
    amount: number;
    ratio: number;
}

interface AnalyzeResult {
    totalExpense: number;
    categories: Category[];
    comment: string;
}

function BackIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const CATEGORY_COLORS: Record<string, string> = {
    식비: '#FF6B6B',
    교통: '#4ECDC4',
    쇼핑: '#45B7D1',
    의료: '#96CEB4',
    문화: '#FFEAA7',
    생활: '#DDA0DD',
    송금: '#98D8C8',
    기타: '#B0B0B0',
};

export default function Analyze() {
    const navigate = useNavigate();
    const { memberId, selectedAccountNo } = useAuthStore();
    const [result, setResult] = useState<AnalyzeResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!memberId || !selectedAccountNo) return;
        setLoading(true);
        apiClient.post('/ai/analyze', { accountNo: selectedAccountNo, memberId })
            .then((res) => setResult(res.data))
            .catch(() => setError('분석 중 오류가 발생했어요.'))
            .finally(() => setLoading(false));
    }, [memberId, selectedAccountNo]);

    return (
        <div className="analyze">
            <header className="analyze__header">
                <button className="analyze__back" onClick={() => navigate('/home')}>
                    <BackIcon />
                </button>
                <h1 className="analyze__title">AI 소비 분석</h1>
            </header>

            {loading && (
                <div className="analyze__loading">
                    <p>✨ AI가 소비 패턴을 분석하고 있어요...</p>
                </div>
            )}

            {error && (
                <div className="analyze__error">
                    <p>{error}</p>
                </div>
            )}

            {result && !loading && (
                <div className="analyze__body">
                    {/* 총 지출 */}
                    <div className="analyze__total-card">
                        <p className="analyze__total-label">이번 달 총 지출</p>
                        <p className="analyze__total-amount">
                            {result.totalExpense.toLocaleString('ko-KR')}원
                        </p>
                    </div>

                    {/* 카테고리별 지출 */}
                    {result.categories.length > 0 && (
                        <div className="analyze__categories">
                            <p className="analyze__section-title">카테고리별 지출</p>
                            {result.categories.map((cat) => (
                                <div key={cat.name} className="analyze__category-item">
                                    <div className="analyze__category-header">
                                        <span
                                            className="analyze__category-dot"
                                            style={{ background: CATEGORY_COLORS[cat.name] ?? '#B0B0B0' }}
                                        />
                                        <span className="analyze__category-name">{cat.name}</span>
                                        <span className="analyze__category-ratio">{cat.ratio}%</span>
                                        <span className="analyze__category-amount">
                                            {cat.amount.toLocaleString('ko-KR')}원
                                        </span>
                                    </div>
                                    <div className="analyze__bar-bg">
                                        <div
                                            className="analyze__bar-fill"
                                            style={{
                                                width: `${cat.ratio}%`,
                                                background: CATEGORY_COLORS[cat.name] ?? '#B0B0B0',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* AI 코멘트 */}
                    <div className="analyze__comment-card">
                        <p className="analyze__comment-title">✨ AI 분석 리포트</p>
                        <p className="analyze__comment">{result.comment}</p>
                    </div>
                </div>
            )}

            {result && result.totalExpense === 0 && !loading && (
                <div className="analyze__empty">
                    <p>아직 지출 내역이 없어요.</p>
                    <p>이체를 시작하면 소비 패턴을 분석해 드릴게요! 💰</p>
                </div>
            )}
        </div>
    );
}