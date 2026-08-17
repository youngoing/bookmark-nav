"use client";

import { createContext, useContext, type ReactNode } from "react";

export type WorkspaceMode = "display" | "edit";

const WorkspaceModeContext = createContext<WorkspaceMode>("display");

export function WorkspaceModeProvider({ mode, children }: { mode: WorkspaceMode; children: ReactNode }) {
  return <WorkspaceModeContext.Provider value={mode}>{children}</WorkspaceModeContext.Provider>;
}

export function useWorkspaceMode(): WorkspaceMode {
  return useContext(WorkspaceModeContext);
}
