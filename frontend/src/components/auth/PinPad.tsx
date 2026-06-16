interface Props {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"];

export default function PinPad({ value, onChange, maxLength = 6 }: Props) {
  const handleKey = (key: string) => {
    if (key === "←") {
      onChange(value.slice(0, -1));
    } else if (key === "") {
      return;
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {/* 입력 표시 (●로 마스킹) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: i < value.length ? "#1a73e8" : "#e0e0e0",
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>

      {/* 키패드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        {KEYS.map((key, idx) => (
          <button
            key={idx}
            onClick={() => handleKey(key)}
            disabled={key === ""}
            style={{
              padding: "16px",
              fontSize: "18px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              background: key === "←" ? "#f1f3f4" : key === "" ? "transparent" : "#f8f9fa",
              color: key === "←" ? "#e53935" : "#202124",
              cursor: key === "" ? "default" : "pointer",
              transition: "background 0.1s",
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}