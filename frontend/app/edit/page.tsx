import Home from "../page";
import { WorkspaceModeProvider } from "../workspace-mode";

export default function EditPage() {
  return <WorkspaceModeProvider mode="edit"><Home /></WorkspaceModeProvider>;
}
