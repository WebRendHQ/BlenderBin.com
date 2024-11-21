// components/Button.tsx
'use client';

type ButtonProps = {
    label: string;
    onClick: () => void;
  };
  
  const Button = ({ label, onClick }: ButtonProps) => {
    return (
      <button
        onClick={onClick}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {label}
      </button>
    );
  };
  
  export default Button;
  