import { Calendar } from 'lucide-react';

import { type Project } from '@/domains/project/schemas';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { SettlementDone } from '@/ui/features/project/components/settlement/SettlementDone';
import { SettlementPreview } from '@/ui/features/project/components/settlement/SettlementPreview';
import { SettlementProcessing } from '@/ui/features/project/components/settlement/SettlementProcessing';
import { SettlementSelection } from '@/ui/features/project/components/settlement/SettlementSelection';
import {
  DialogStatus,
  useSettlementDialog,
} from '@/ui/features/project/components/settlement/useSettlementDialog';

interface SettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  email?: string;
  projects: Project[];
  onSuccess: () => void;
}

const SettlementDialog: React.FC<SettlementDialogProps> = ({
  isOpen,
  onClose,
  householdId,
  email,
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
  } = useSettlementDialog(householdId, projects, email, onSuccess, onClose);

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
