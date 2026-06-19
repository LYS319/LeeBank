interface Props {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-6-6a1.2 1.2 0 0 1 0-2l6-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 10l-4 4M10 10l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function PinPad({ value, onChange, maxLength = 6 }: Props) {
  const handleKey = (key: string) => {
    if (key === "del") {
      onChange(value.slice(0, -1));
    } else if (key === "") {
      return;
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <div>
      <div className="pinpad__dots">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`pinpad__dot${i < value.length ? " pinpad__dot--filled" : ""}`}
          />
        ))}
      </div>

      <div className="pinpad__grid">
        {KEYS.map((key, idx) => (
          <button
            key={idx}
            type="button"
            className={`pinpad__key${key === "" ? " pinpad__key--empty" : ""}${
              key === "del" ? " pinpad__key--del" : ""
            }`}
            onClick={() => handleKey(key)}
            disabled={key === ""}
            aria-label={key === "del" ? "지우기" : key === "" ? undefined : key}
          >
            {key === "del" ? <DeleteIcon /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
