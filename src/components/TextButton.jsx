// 글자 버튼. variant: neutral(회색 채움) | strong(흑백 반전 채움) | danger(빨간 글자)
export default function TextButton({ children, onClick, variant = 'neutral', disabled = false }) {
  return (
    <button type="button" className={`text-button text-button--${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
