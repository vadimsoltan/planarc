import * as React from "react";

import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none transition placeholder:text-ink/40 focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:h-11 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
