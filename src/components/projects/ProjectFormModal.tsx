import React, { useState, useEffect } from 'react';
import { type Project, ProjectCategory } from '../../schemas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => Promise<void>;
  initialData?: Partial<Project> | null;
  title?: string;
}

const ICON_OPTIONS = [
  '🏠', '🏡', '🏢', '🏪', '🏬', '🏭', '🏗️', '🏘️',
  '🛒', '🛍️', '🍔', '🍕', '🍜', '🍱', '🍞', '☕',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
  '💰', '💵', '💴', '💶', '💷', '💳', '💸', '🏦',
  '📱', '💻', '🖥️', '⌚', '📷', '📺', '🎮', '🎧',
  '👔', '👗', '👕', '👖', '🧥', '👞', '👟', '🎒',
  '🏥', '💊', '🩺', '💉', '🧬', '🔬', '🧪', '🩹',
  '📚', '📖', '📝', '✏️', '🖊️', '📄', '📋', '📌',
  '🎓', '🎯', '🎨', '🎭', '🎪', '🎬', '🎵', '🎸',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸',
];

const CATEGORY_LABELS: Record<string, string> = {
  [ProjectCategory.OPERATING]: '營運類',
  [ProjectCategory.FINANCING]: '融資類',
  [ProjectCategory.INVESTING]: '投資類',
  [ProjectCategory.ASSET]: '資產類',
  [ProjectCategory.LIABILITY]: '負債類',
  [ProjectCategory.RECONCILIATION]: '調節類',
  [ProjectCategory.PERSONAL]: '個人類',
};

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    category: ProjectCategory.OPERATING as ProjectCategory,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        category: ProjectCategory.OPERATING as ProjectCategory,
        ...initialData,
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const accountingEnabled = formData.accounting?.enabled || false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || (initialData?.id ? 'Edit Project' : 'New Project')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">基本資訊</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">名稱 *</Label>
                <Input
                  id="project-name"
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：生活費、房租"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-category">專案類別 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as ProjectCategory }))}
                  disabled={loading}
                >
                  <SelectTrigger id="project-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-icon">圖示</Label>
                <Input
                  id="project-icon"
                  type="text"
                  value={formData.icon || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="🛒"
                  disabled={loading}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" type="button" className="w-full">
                      選擇圖示
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid grid-cols-8 gap-2">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className="text-2xl hover:bg-accent p-2 rounded transition-colors"
                          onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-color">顏色</Label>
                <Input
                  id="project-color"
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="#3B82F6"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">說明</Label>
              <textarea
                id="project-description"
                value={formData.description || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          {/* Accounting Configuration */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accounting-enabled"
                checked={accountingEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    accounting: { ...(prev.accounting || {}), enabled: checked === true } as typeof prev.accounting,
                  }))
                }
                disabled={loading}
              />
              <Label htmlFor="accounting-enabled" className="text-sm font-semibold cursor-pointer">
                啟用會計設定
              </Label>
            </div>

            {accountingEnabled && (
              <div className="space-y-6 pl-6 border-l-2">
                {/* Income Statement */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">📊 損益表</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">類別</Label>
                      <Select
                        value={formData.accounting?.incomeStatement?.category || ''}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              incomeStatement: {
                                ...(prev.accounting?.incomeStatement || {} as never),
                                category: value as 'income' | 'expense',
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      >
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">收入</SelectItem>
                          <SelectItem value="expense">支出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">子類別</Label>
                      <Input
                        value={formData.accounting?.incomeStatement?.subcategory || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              incomeStatement: {
                                ...(prev.accounting?.incomeStatement || {} as never),
                                subcategory: e.target.value,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        placeholder="生活費用"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">排序</Label>
                      <Input
                        type="number"
                        value={formData.accounting?.incomeStatement?.order ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              incomeStatement: {
                                ...(prev.accounting?.incomeStatement || {} as never),
                                order: parseInt(e.target.value) || 0,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        placeholder="0"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Cash Flow */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">💰 現金流量</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">活動</Label>
                      <Select
                        value={formData.accounting?.cashFlow?.activity || ''}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              cashFlow: {
                                ...(prev.accounting?.cashFlow || {} as never),
                                activity: value as 'operating' | 'investing' | 'financing' | 'reconciliation',
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      >
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operating">營運</SelectItem>
                          <SelectItem value="investing">投資</SelectItem>
                          <SelectItem value="financing">融資</SelectItem>
                          <SelectItem value="reconciliation">調節</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">子類別</Label>
                      <Input
                        value={formData.accounting?.cashFlow?.subcategory || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              cashFlow: {
                                ...(prev.accounting?.cashFlow || {} as never),
                                subcategory: e.target.value,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">排序</Label>
                      <Input
                        type="number"
                        value={formData.accounting?.cashFlow?.order ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              cashFlow: {
                                ...(prev.accounting?.cashFlow || {} as never),
                                order: parseInt(e.target.value) || 0,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        placeholder="0"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Sheet */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">📈 資產負債表</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">類別</Label>
                      <Select
                        value={formData.accounting?.balanceSheet?.category || ''}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              balanceSheet: {
                                ...(prev.accounting?.balanceSheet || {} as never),
                                category: value as 'asset' | 'liability' | 'equity',
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      >
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">資產</SelectItem>
                          <SelectItem value="liability">負債</SelectItem>
                          <SelectItem value="equity">權益</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">子類別</Label>
                      <Select
                        value={formData.accounting?.balanceSheet?.subcategory || ''}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              balanceSheet: {
                                ...(prev.accounting?.balanceSheet || {} as never),
                                subcategory: value as 'current' | 'fixed' | 'investment' | 'longTerm' | 'shortTerm',
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      >
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">流動</SelectItem>
                          <SelectItem value="fixed">固定</SelectItem>
                          <SelectItem value="investment">投資</SelectItem>
                          <SelectItem value="longTerm">長期</SelectItem>
                          <SelectItem value="shortTerm">短期</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">排序</Label>
                      <Input
                        type="number"
                        value={formData.accounting?.balanceSheet?.order ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              balanceSheet: {
                                ...(prev.accounting?.balanceSheet || {} as never),
                                order: parseInt(e.target.value) || 0,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        placeholder="0"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is-debt"
                        checked={formData.accounting?.balanceSheet?.isDebt || false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              balanceSheet: {
                                ...(prev.accounting?.balanceSheet || {} as never),
                                isDebt: checked === true,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      />
                      <Label htmlFor="is-debt" className="cursor-pointer">債務</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is-investment"
                        checked={formData.accounting?.balanceSheet?.isInvestment || false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              balanceSheet: {
                                ...(prev.accounting?.balanceSheet || {} as never),
                                isInvestment: checked === true,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      />
                      <Label htmlFor="is-investment" className="cursor-pointer">投資</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is-real-estate"
                        checked={formData.accounting?.balanceSheet?.isRealEstate || false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            accounting: {
                              ...(prev.accounting || {}),
                              balanceSheet: {
                                ...(prev.accounting?.balanceSheet || {} as never),
                                isRealEstate: checked === true,
                              },
                            } as typeof prev.accounting,
                          }))
                        }
                        disabled={loading}
                      />
                      <Label htmlFor="is-real-estate" className="cursor-pointer">不動產</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? '儲存中...' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormModal;
