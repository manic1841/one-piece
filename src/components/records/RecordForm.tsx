import { RecordFormContent } from '@/components/records/form/RecordFormContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Record, RecordFormTitles } from '@/domains/record/types';

interface RecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Record;
  householdId: string;
  userEmail: string;
}

const RecordForm: React.FC<RecordFormProps> = (props) => {
  const { isOpen, onClose, initialData } = props;
  const getDialogTitle = () => {
    if (initialData) return RecordFormTitles.EDIT;
    return RecordFormTitles.CREATE;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <RecordFormContent {...props} isOpen={isOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default RecordForm;
