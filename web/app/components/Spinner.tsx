interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses: Record<string, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-blue-200
        border-t-blue-600
        rounded-full
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  )
}
