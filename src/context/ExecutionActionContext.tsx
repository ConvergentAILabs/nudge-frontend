import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type ExecutionActionOption = {
  key: string;
  label: string;
};

export type ExecutionAction = {
  actionId: string;
  executionId: string;
  reason: string;
  clarification?: string;
  options: ExecutionActionOption[];
};

type ExecutionActionContextType = {
  currentAction: ExecutionAction | null;
};

/* ------------------------------------------------------------------ */
/* Context                                                            */
/* ------------------------------------------------------------------ */

const ExecutionActionContext =
  createContext<ExecutionActionContextType | null>(null);

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */

/**
 * IMPORTANT:
 * This provider is READ-ONLY in Phase 9.
 * It must NOT open its own SSE connection.
 * ChatContext owns the stream.
 */
export const ExecutionActionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentAction] =
    useState<ExecutionAction | null>(null);

  const value = useMemo(
    () => ({
      currentAction,
    }),
    [currentAction]
  );

  return (
    <ExecutionActionContext.Provider value={value}>
      {children}
    </ExecutionActionContext.Provider>
  );
};

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export const useExecutionAction = (): ExecutionActionContextType => {
  const ctx = useContext(ExecutionActionContext);
  if (!ctx) {
    throw new Error(
      "useExecutionAction must be used within ExecutionActionProvider"
    );
  }
  return ctx;
};
