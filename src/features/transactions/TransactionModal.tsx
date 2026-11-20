import { Modal } from '../../components/Modal';
import { useFinance } from '../../state/FinanceContext';
import { useToast } from '../../state/ToastContext';
import { useUi } from '../../state/UiContext';
import { TransactionForm } from './TransactionForm';

/** One app-wide add/edit dialog, opened from the header, pages or empty states. */
export function TransactionModal() {
  const { form, closeTransactionForm } = useUi();
  const { addTransaction, updateTransaction, today } = useFinance();
  const { notify } = useToast();
  const editing = form.open ? form.editing : null;

  return (
    <Modal
      open={form.open}
      title={editing ? 'Edit transaction' : 'Add transaction'}
      description={editing ? 'Update the details and save.' : 'Record income or an expense. It is saved in this browser only.'}
      onClose={closeTransactionForm}
    >
      <TransactionForm
        key={editing?.id ?? 'new'}
        initial={editing}
        today={today}
        onCancel={closeTransactionForm}
        onSubmit={(value) => {
          if (editing) {
            updateTransaction(editing.id, value);
            notify('Transaction updated.');
          } else {
            addTransaction(value);
            notify(value.type === 'income' ? 'Income added.' : 'Expense added.');
          }
          closeTransactionForm();
        }}
      />
    </Modal>
  );
}
