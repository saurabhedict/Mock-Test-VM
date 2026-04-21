import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordRules } from "@/lib/passwordPolicy";

type PasswordStrengthChecklistProps = {
  password: string;
  className?: string;
};

export default function PasswordStrengthChecklist({ password, className }: PasswordStrengthChecklistProps) {
  const rules = getPasswordRules(password);
  const hasInput = password.length > 0;

  return (
    <ul className={cn("mt-2 space-y-1 text-xs", className)}>
      {rules.map((rule) => (
        <li
          key={rule.key}
          className={cn(
            "flex items-center gap-2",
            rule.passed && "text-green-600 dark:text-green-400",
            !rule.passed && hasInput && "text-red-600 dark:text-red-400",
            !rule.passed && !hasInput && "text-muted-foreground",
          )}
        >
          {rule.passed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}
