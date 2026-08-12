"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1.5">
      <span className="text-[10px] md:text-xs font-semibold md:font-medium text-muted/60 uppercase md:normal-case tracking-wider md:tracking-normal px-2 md:px-0">Theme:</span>
      <div className="relative group">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="text-xs appearance-none outline-none bg-transparent hover:bg-surface-hover text-muted hover:text-text px-2 py-1.5 rounded-md transition-colors cursor-pointer pr-5 font-medium"
          title="Select Theme"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="claude">Claude</option>
        </select>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-muted/70 group-hover:text-text transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
    </div>
  );
}
