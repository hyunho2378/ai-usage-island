// 아이콘만 있는 버튼. 이름은 반드시 aria-label 로 준다.
export default function IconButton({ label, onClick, children, spinning = false, disabled = false }) {
  return (
    <button
      type="button"
      className={`icon-button${spinning ? ' icon-button--spinning' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="icon-button__glyph">{children}</span>
    </button>
  );
}
