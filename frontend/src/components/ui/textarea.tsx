import * as React from "react";

import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-32 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink/40 focus:border-ember/50 focus:ring-2 focus:ring-ember/20 md:min-h-28 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
