import { forwardRef, InputHTMLAttributes } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={props.id} className="text-base font-semibold text-app sm:text-lg xl:text-xl">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border border-app px-4 py-3 sm:px-5 sm:py-3.5 text-base text-app placeholder:text-app-muted bg-app-surface transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed sm:text-lg xl:px-6 xl:py-4 xl:text-xl ${className}`}
          {...props}
        />
        {error && <p className="text-sm sm:text-base text-red-500 font-medium">{error}</p>}
        {helperText && !error && <p className="text-sm sm:text-base text-app-muted">{helperText}</p>}
      </div>
    );
  },
);

InputField.displayName = "InputField";
