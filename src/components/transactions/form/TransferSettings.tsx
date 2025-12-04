import { ProjectSelection } from './ProjectSelection';
import { type Project } from '@/schemas';
import { type UnifiedRecord } from './types/unifiedRecord';

interface TransferSettingsProps {
  fromProjectId: string;
  setFromProjectId: <K extends keyof UnifiedRecord>(name: K, value: UnifiedRecord[K]) => void;
  toProjectId: string;
  setToProjectId: <K extends keyof UnifiedRecord>(name: K, value: UnifiedRecord[K]) => void;
  projects: Project[];
}

export const TransferSettings: React.FC<TransferSettingsProps> = (props) => {
  const { fromProjectId, setFromProjectId, toProjectId, setToProjectId, projects } = props;

  const handleFromProjectIdChange = (projectId: string) => {
    setFromProjectId('sourceProjectId', projectId);
  };

  const handleToProjectIdChange = (projectId: string) => {
    setToProjectId('mainProjectId', projectId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProjectSelection
        label="來源專案（選填）"
        projectId={fromProjectId}
        setProjectId={handleFromProjectIdChange}
        projects={projects}
        excludeProjectId={toProjectId}
        required={false}
      />
      <ProjectSelection
        label="目標專案（選填）"
        projectId={toProjectId}
        setProjectId={handleToProjectIdChange}
        projects={projects}
        excludeProjectId={fromProjectId}
        required={false}
      />
    </div>
  );
};
