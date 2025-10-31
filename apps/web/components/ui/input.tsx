"use client";
import * as React from "react";
import clsx from "clsx";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, trailingIcon, error = false, ...props }, ref) => {
    return (
      <div className={clsx("relative", className)}>
        {leadingIcon ? (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground" aria-hidden>
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          className={clsx(
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive focus-visible:ring-destructive" : "border-input focus-visible:ring-primary",
            leadingIcon ? "pl-9" : "",
            trailingIcon ? "pr-9" : ""
          )}
          {...props}
        />
        {trailingIcon ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground" aria-hidden>
            {trailingIcon}
          </span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";