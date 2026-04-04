import React, { useState } from "react";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState("dark");

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="bg-gray-800 px-3 py-2 rounded"
    >
      Theme: {theme}
    </button>
  );
};
