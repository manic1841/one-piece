import { ProjectSelection } from './ProjectSelection';
import { type Project } from '@/schemas';

interface TransferSettingsProps {
  fromProjectId: string;
  setFromProjectId: (projectId: string) => void;
  toProjectId: string;
  setToProjectId: (projectId: string) => void;
  projects: Project[];
}

export const TransferSettings: React.FC<TransferSettingsProps> = (props) => {
  const { fromProjectId, setFromProjectId, toProjectId, setToProjectId, projects } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProjectSelection
        label="來源專案（選填）"
        projectId={fromProjectId}
        setProjectId={setFromProjectId}
        projects={projects}
        excludeProjectId={toProjectId}
        required={false}
      />
      <ProjectSelection
        label="目標專案（選填）"
        projectId={toProjectId}
        setProjectId={setToProjectId}
        projects={projects}
        excludeProjectId={fromProjectId}
        required={false}
      />
    </div>
  );
};
