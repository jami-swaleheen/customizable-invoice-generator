"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInvoice } from "@/app/actions";

type Props = {
  id: string;
  label: string;
};

export default function DeleteInvoiceButton({ id, label }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await deleteInvoice(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeDialog();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-slate-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded p-1.5 relative z-10"
        aria-label={`Delete ${label}`}
        title="Delete invoice"
      >
        <TrashIcon />
      </button>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 rounded-xl p-0 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm max-w-sm w-[92vw] shadow-2xl"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
        aria-labelledby={`del-${id}-title`}
      >
        <div className="p-6">
          <h2
            id={`del-${id}-title`}
            className="text-lg font-semibold text-slate-900"
          >
            Delete this invoice?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{label}</span> will be
            permanently removed. This can&rsquo;t be undone.
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isPending}
              className="px-3 py-2 text-sm rounded-lg ring-1 ring-slate-300 bg-white hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
            >
              {isPending ? "Deleting…" : "Delete invoice"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
