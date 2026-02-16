interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin-slow ${sizes[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: 'var(--accent)' }}
    >
      <circle
        style={{ opacity: 0.15 }}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        style={{ opacity: 0.8 }}
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
