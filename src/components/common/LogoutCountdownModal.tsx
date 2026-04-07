import { HiLogout, HiX } from 'react-icons/hi';

export type LogoutCountdownModalProps = {
  open: boolean;
  /** Pre-formatted countdown label, e.g. "5s" */
  formattedTime: string;
  onDismiss: () => void;
  onLogoutNow: () => void;
};

/**
 * Confirms manual logout with a short countdown before auto sign-out.
 */
export function LogoutCountdownModal({
  open,
  formattedTime,
  onDismiss,
  onLogoutNow,
}: LogoutCountdownModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-countdown-title"
      aria-describedby="logout-countdown-desc"
    >
      <div className="relative w-full max-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-16px_rgba(15,23,42,0.28)]">
        <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" aria-hidden />

        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-3 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          aria-label="Close and stay signed in"
        >
          <HiX className="h-5 w-5" />
        </button>

        <div className="px-8 pb-8 pt-6 text-center sm:px-9">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200/80"
            aria-hidden
          >
            <HiLogout className="h-7 w-7 text-brand-600" />
          </div>

          <h2
            id="logout-countdown-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Signing you out
          </h2>
          <p
            id="logout-countdown-desc"
            className="mx-auto mt-2 max-w-[20rem] text-sm leading-relaxed text-slate-500"
          >
            For your security, your session will end automatically unless you stay.
          </p>

          <div className="mt-6 inline-flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl bg-slate-50 px-5 py-3 ring-1 ring-inset ring-slate-200/80">
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
              Time left
            </span>
            <span className="mt-0.5 font-mono text-3xl font-semibold tabular-nums tracking-tight text-brand-600">
              {formattedTime}
            </span>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:flex-row-reverse">
            <button
              type="button"
              onClick={onLogoutNow}
              className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Log out now
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Stay signed in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
