import React, { useState } from "react";

export const ModeSelector: React.FC = () => {
  const [mode, setMode] = useState("MAX");

  return (
    <div className="space-y-2">
      {["MAX", "ELON", "EINSTEIN"].map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`block w-full p-2 rounded ${
            mode === m ? "bg-blue-600" : "bg-gray-800"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
};
