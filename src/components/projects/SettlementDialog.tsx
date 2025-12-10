import { SettlementDone } from '@/components/projects/settlement/SettlementDone';
import { SettlementPreview } from '@/components/projects/settlement/SettlementPreview';
import { SettlementProcessing } from '@/components/projects/settlement/SettlementProcessing';
import { SettlementSelection } from '@/components/projects/settlement/SettlementSelection';
import {
  DialogStatus,
  useSettlementDialog,
} from '@/components/projects/settlement/useSettlementDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Project } from '@/domains/project/types';
import { Calendar } from 'lucide-react';

interface SettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  projects: Project[];
  onSuccess: () => void;
}

const SettlementDialog: React.FC<SettlementDialogProps> = ({
  isOpen,
  onClose,
  householdId,
  projects,
  onSuccess,
}) => {
  const {
    status,
    year,
    month,
    close,
    setYear,
    setMonth,
    settlements,
    error,
    toPreview,
    confirm,
    back,
  } = useSettlementDialog(householdId, projects, undefined, onSuccess, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <DialogTitle>Monthly Settlement</DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {status === DialogStatus.SELECTION && (
            <SettlementSelection
              year={year}
              month={month}
              setYear={setYear}
              setMonth={setMonth}
              error={error}
            />
          )}

          {status === DialogStatus.PREVIEW && (
            <SettlementPreview year={year} month={month} error={error} settlements={settlements} />
          )}

          {status === DialogStatus.PROCESSING && <SettlementProcessing />}
          {status === DialogStatus.DONE && <SettlementDone />}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-6">
          {status === DialogStatus.SELECTION && (
            <>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={toPreview}>Next</Button>
            </>
          )}

          {status === DialogStatus.PREVIEW && (
            <>
              <Button variant="outline" onClick={back}>
                Back
              </Button>
              <Button onClick={confirm} className="bg-green-600 hover:bg-green-700">
                Confirm
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettlementDialog;
