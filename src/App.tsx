import React from "react";

import { ChatProvider } from "./context/ChatContext";
import { WizardProvider } from "./context/WizardContext";
import { ExecutionActionProvider } from "./context/ExecutionActionContext";
import { ElonNudgeProvider } from "./context/ElonNudgeContext";

import { Surface } from "./ui/layout/Surface";

const App: React.FC = () => {
  return (
    <ChatProvider>
      <ExecutionActionProvider>
        <WizardProvider>
          <ElonNudgeProvider>
            <Surface />
          </ElonNudgeProvider>
        </WizardProvider>
      </ExecutionActionProvider>
    </ChatProvider>
  );
};

export default App;