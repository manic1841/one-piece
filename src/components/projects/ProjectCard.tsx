import React from 'react';
import { type Project } from '../../schemas';
import { formatCurrency } from '../../utils/formatUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectCardProps {
  project: Project;
  balance: number;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, balance, onClick }) => {
  const isPositive = balance >= 0;

  return (
    <Card
      onClick={onClick}
      className="hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <span
          className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${project.color}`}
        >
          {project.icon}
        </span>
        <div>
          <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
            <span className={`text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
