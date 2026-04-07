import { useEffect, useState } from 'react';
import { HiArrowLeft, HiExclamationCircle, HiX } from 'react-icons/hi';

type Props = {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
};

const DECLARATION_TEXT =
  'I hereby declare that the information I have provided is true and correct to the best of my knowledge. I understand that providing false information may result in suspension or termination of my account.';

export function SelfDeclarationModal({ open, onClose, onBack, onConfirm }: Props) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[64] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="self-declaration-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="self-declaration-title" className="text-lg font-semibold text-gray-900">
            Self Declaration
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Close"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <HiArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <HiExclamationCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-amber-900">Limited Access Notice</p>
            <p className="text-sm text-amber-900/90 leading-relaxed">
              This option is a temporary verification method; your profile may not enjoy full access to the
              network. For full access, please verify using a Government ID.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 leading-relaxed">{DECLARATION_TEXT}</span>
          </label>
        </div>

        <button
          type="button"
          disabled={!agreed}
          onClick={() => {
            onConfirm();
          }}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-45 disabled:pointer-events-none"
        >
          Confirm Self Declaration
        </button>
      </div>
    </div>
  );
}
