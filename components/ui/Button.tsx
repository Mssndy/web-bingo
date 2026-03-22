interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary:   'bg-[var(--color-bingo-pink)] text-white shadow-lg',
  secondary: 'bg-[var(--color-bingo-blue)] text-white shadow-lg',
  ghost:     'bg-white border-2 border-gray-200 text-gray-700',
};

const sizeClasses = {
  sm: 'text-base px-4 py-2 rounded-xl',
  md: 'text-xl px-5 py-3 rounded-2xl',
  lg: 'text-2xl px-6 py-5 rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        font-black active:scale-95 transition-transform
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
