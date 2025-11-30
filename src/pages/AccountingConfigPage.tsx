import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/useAuth';
import { projectService } from '../services/projectService';
import { accountingConfigService } from '../services/accountingConfigService';
import { AccountingCategorySchema, type AccountingCategory } from '../schemas/accountingConfig';
import type { Project } from '../schemas';

const CATEGORIES = AccountingCategorySchema.options;

const AccountingConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [mappings, setMappings] = useState<Record<string, AccountingCategory>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  const householdId = userProfile?.householdId;

  useEffect(() => {
    const loadData = async () => {
      if (!householdId) return;
      setLoading(true);
      try {
        const [projectsData, configData] = await Promise.all([
          projectService.getProjects(householdId),
          accountingConfigService.getConfig(householdId),
        ]);

        setProjects(projectsData.filter((p) => p.isActive));
        if (configData) {
          setMappings(configData.projectMappings);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('無法載入設定資料');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [householdId]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.setData('text/plain', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropToCategory = (e: React.DragEvent, category: AccountingCategory) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain');
    if (projectId) {
      setMappings((prev) => ({
        ...prev,
        [projectId]: category,
      }));
    }
    setDraggedProjectId(null);
  };

  const handleDropToPool = (e: React.DragEvent) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain');
    if (projectId) {
      setMappings((prev) => {
        const newMappings = { ...prev };
        delete newMappings[projectId];
        return newMappings;
      });
    }
    setDraggedProjectId(null);
  };

  const handleSave = async () => {
    if (!householdId || !currentUser?.email) return;
    setSaving(true);
    try {
      await accountingConfigService.saveConfig(householdId, mappings, currentUser.email);
      navigate('/reports/income-statement');
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const ProjectChip = ({ project }: { project: Project }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, project.id)}
      onDragEnd={handleDragEnd}
      className={`
        flex items-center gap-2 px-3 py-2 bg-white border rounded-full shadow-sm cursor-move 
        hover:shadow-md transition-all active:cursor-grabbing
        ${draggedProjectId === project.id ? 'opacity-50' : ''}
      `}
    >
      <GripVertical className="h-4 w-4 text-slate-400" />
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: project.color }}
      />
      <span className="text-sm font-medium text-slate-700">{project.name}</span>
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center">載入中...</div>;
  }

  const unassignedProjects = projects.filter((p) => !mappings[p.id]);

  return (
    <div className="space-y-6 container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports/income-statement')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">會計科目設定</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm font-medium">{error}</div>
      )}

      <div className="space-y-8">
        {/* Unassigned Pool */}
        <Card
          className={`border-2 border-dashed transition-colors ${
            draggedProjectId ? 'bg-slate-50 border-slate-300' : 'border-slate-200'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDropToPool}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-muted-foreground flex items-center justify-between">
              <span>未分配專案 (拖拉至下方分類)</span>
              <span className="text-sm font-normal bg-slate-100 px-2 py-1 rounded-full">
                {unassignedProjects.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 min-h-[60px]">
              {unassignedProjects.map((project) => (
                <ProjectChip key={project.id} project={project} />
              ))}
              {unassignedProjects.length === 0 && (
                <div className="w-full text-center text-sm text-muted-foreground py-4">
                  所有專案都已分配
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const categoryProjects = projects.filter((p) => mappings[p.id] === category);

            return (
              <Card
                key={category}
                className={`transition-all ${
                  draggedProjectId ? 'hover:ring-2 hover:ring-primary/20' : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropToCategory(e, category)}
              >
                <CardHeader className="pb-3 bg-slate-50/50 border-b">
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    {category}
                    <span className="text-sm font-normal text-muted-foreground bg-white border px-2 py-0.5 rounded-full">
                      {categoryProjects.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 min-h-[120px]">
                  <div className="flex flex-wrap gap-2">
                    {categoryProjects.map((project) => (
                      <ProjectChip key={project.id} project={project} />
                    ))}
                    {categoryProjects.length === 0 && (
                      <div className="w-full text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                        拖拉專案至此
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AccountingConfigPage;
