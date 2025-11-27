import React from 'react';
import { type Project } from '../../schemas';
import { formatCurrency } from '../../utils/formatUtils';

interface ProjectCardProps {
    project: Project;
    balance: number;
    onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, balance, onClick }) => {
    const isPositive = balance >= 0;

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span
                        className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${project.color}`}
                    >
                        {project.icon}
                    </span>
                    <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        {project.description && (
                            <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Current Balance</span>
                    <span
                        className={`text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                    >
                        {formatCurrency(balance)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
