import { type RecordFormData } from '@/domains/record/types';
import { type Project } from '@/schemas';

import { ProjectSelection } from './ProjectSelection';

interface TransferSettingsProps {
  fromProjectId: string;
  setFromProjectId: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
  toProjectId: string;
  setToProjectId: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
  projects: Project[];
  loading?: boolean;
}

export const TransferSettings: React.FC<TransferSettingsProps> = (props) => {
  const { fromProjectId, setFromProjectId, toProjectId, setToProjectId, projects, loading } = props;
  const handleFromProjectIdChange = (projectId: string) => {
    setFromProjectId('fromProjectId', projectId);
  };

  const handleToProjectIdChange = (projectId: string) => {
    setToProjectId('toProjectId', projectId);
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
        loading={loading}
      />
      <ProjectSelection
        label="目標專案（選填）"
        projectId={toProjectId}
        onChange={handleToProjectIdChange}
        projects={projects}
        excludeProjectId={fromProjectId}
        required={false}
        loading={loading}
      />
    </div>
  );
};
