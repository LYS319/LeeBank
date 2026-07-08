import { useEffect, useState, useRef } from 'react';
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

const CATEGORY_COLORS: Record<string, string> = {
    식비: '#FF6B6B',
    교통: '#4ECDC4',
    쇼핑: '#45B7D1',
    의료: '#96CEB4',
    문화: '#FFD93D',
    생활: '#DDA0DD',
    송금: '#98D8C8',
    기타: '#C0C0C0',
};

function DonutChart({ categories }: { categories: Category[] }) {
    const size = 200;
    const strokeWidth = 36;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;

    let offset = 0;
    const segments = categories.map((cat) => {
        const dash = (cat.ratio / 100) * circumference;
        const gap = circumference - dash;
        const seg = { cat, dash, gap, offset };
        offset += dash;
        return seg;
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* 배경 원 */}
            <circle
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke="#f0f0f0"
                strokeWidth={strokeWidth}
            />
            {segments.map(({ cat, dash, gap, offset: segOffset }) => (
                <circle
                    key={cat.name}
                    cx={cx} cy={cy} r={radius}
                    fill="none"
                    stroke={CATEGORY_COLORS[cat.name] ?? '#C0C0C0'}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-segOffset + circumference * 0.25}
                    strokeLinecap="butt"
                />
            ))}
            {/* 중앙 텍스트 */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" fill="#888">총 지출</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill="#222">
                {categories.reduce((s, c) => s + c.amount, 0).toLocaleString('ko-KR')}원
            </text>
        </svg>
    );
}

export default function Analyze() {
    const navigate = useNavigate();
    const { memberId, selectedAccountNo } = useAuthStore();
    const [result, setResult] = useState<AnalyzeResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [animated, setAnimated] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!memberId || !selectedAccountNo) return;
        setLoading(true);
        apiClient.post('/ai/analyze', { accountNo: selectedAccountNo, memberId })
            .then((res) => {
                setResult(res.data);
                setTimeout(() => setAnimated(true), 100);
            })
            .catch(() => setError('분석 중 오류가 발생했어요.'))
            .finally(() => setLoading(false));
    }, [memberId, selectedAccountNo]);

    return (
        <div className="analyze">
            <header className="analyze__header">
                <button className="analyze__back" onClick={() => navigate('/home')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1 className="analyze__title">AI 소비 분석</h1>
            </header>

            {loading && (
                <div className="analyze__loading">
                    <div className="analyze__loading-spinner" />
                    <p>✨ AI가 소비 패턴을 분석하고 있어요...</p>
                </div>
            )}

            {error && (
                <div className="analyze__error"><p>{error}</p></div>
            )}

            {result && !loading && result.totalExpense === 0 && (
                <div className="analyze__empty">
                    <p>아직 지출 내역이 없어요.</p>
                    <p>이체를 시작하면 소비 패턴을 분석해 드릴게요! 💰</p>
                </div>
            )}

            {result && !loading && result.totalExpense > 0 && (
                <div className="analyze__body" ref={bodyRef}>

                    {/* 도넛 차트 */}
                    {result.categories.length > 0 && (
                        <div className="analyze__donut-section">
                            <DonutChart categories={result.categories} />
                            {/* 범례 */}
                            <div className="analyze__legend">
                                {result.categories.map((cat) => (
                                    <div key={cat.name} className="analyze__legend-item">
                                        <span
                                            className="analyze__legend-dot"
                                            style={{ background: CATEGORY_COLORS[cat.name] ?? '#C0C0C0' }}
                                        />
                                        <span className="analyze__legend-name">{cat.name}</span>
                                        <span className="analyze__legend-ratio">{cat.ratio}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 바 그래프 */}
                    {result.categories.length > 0 && (
                        <div className="analyze__bars">
                            <p className="analyze__section-title">카테고리별 지출</p>
                            {result.categories.map((cat) => (
                                <div key={cat.name} className="analyze__bar-item">
                                    <div className="analyze__bar-label-row">
                                        <span
                                            className="analyze__bar-dot"
                                            style={{ background: CATEGORY_COLORS[cat.name] ?? '#C0C0C0' }}
                                        />
                                        <span className="analyze__bar-name">{cat.name}</span>
                                        <span className="analyze__bar-amount">
                                            {cat.amount.toLocaleString('ko-KR')}원
                                        </span>
                                        <span className="analyze__bar-ratio">{cat.ratio}%</span>
                                    </div>
                                    <div className="analyze__bar-track">
                                        <div
                                            className="analyze__bar-fill"
                                            style={{
                                                width: animated ? `${cat.ratio}%` : '0%',
                                                background: CATEGORY_COLORS[cat.name] ?? '#C0C0C0',
                                                transition: 'width 0.8s ease',
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
        </div>
    );
}