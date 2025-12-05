import { ProjectSelection } from './ProjectSelection';
import { type Project } from '@/schemas';
import { type RecordFormData } from '@/domains/record/types';

interface TransferSettingsProps {
  fromProjectId: string;
  setFromProjectId: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
  toProjectId: string;
  setToProjectId: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
  projects: Project[];
}

export const TransferSettings: React.FC<TransferSettingsProps> = (props) => {
  const { fromProjectId, setFromProjectId, toProjectId, setToProjectId, projects } = props;

  const handleFromProjectIdChange = (projectId: string) => {
    setFromProjectId('fromProjectId', projectId);
  };

  const handleToProjectIdChange = (projectId: string) => {
    setToProjectId('projectId', projectId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProjectSelection
        label="來源專案（選填）"
        projectId={fromProjectId}
        onChange={handleFromProjectIdChange}
        projects={projects}
        excludeProjectId={toProjectId}
        required={false}
      />
      <ProjectSelection
        label="目標專案（選填）"
        projectId={toProjectId}
        onChange={handleToProjectIdChange}
        projects={projects}
        excludeProjectId={fromProjectId}
        required={false}
      />
    </div>
  );
};
