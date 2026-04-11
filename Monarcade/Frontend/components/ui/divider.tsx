interface DividerProps {
  text?: string;
}

export function Divider({ text = "or" }: DividerProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-border"></div>
      {text && <span className="text-base font-medium text-app-muted whitespace-nowrap sm:text-lg">{text}</span>}
      <div className="flex-1 h-px bg-border"></div>
    </div>
  );
}
