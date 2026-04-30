"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { triggerClientFeedback } from "@/lib/client-feedback";

export type ContractDetailActions = {
  contractId: string;
  createRevisionAction: (formData: FormData) => Promise<RrhhActionResult>;
  finalizeAction: (formData: FormData) => Promise<RrhhActionResult>;
  uploadAttachmentAction: (formData: FormData) => Promise<RrhhActionResult>;
  deleteAttachmentAction: (formData: FormData) => Promise<RrhhActionResult>;
  signAttachmentUrl: (attachmentId: string) => Promise<string | null>;
};

export function useContractDetail({
  contractId,
  createRevisionAction,
  finalizeAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  signAttachmentUrl,
}: ContractDetailActions) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [reviseOpen, setReviseOpen] = useState(false);
  const [revisePending, setRevisePending] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [percentInput, setPercentInput] = useState("");
  const [calcMode, setCalcMode] = useState<"amount" | "percent">("amount");
  const [motivoKey, setMotivoKey] = useState("");
  const [observations, setObservations] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizePending, setFinalizePending] = useState(false);

  function resetReviseForm() {
    setAmountInput("");
    setPercentInput("");
    setCalcMode("amount");
    setMotivoKey("");
    setObservations("");
  }

  function closeReviseModal() {
    setReviseOpen(false);
    resetReviseForm();
  }

  async function handleReviseSubmit(formData: FormData) {
    setRevisePending(true);
    try {
      const result = await createRevisionAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setReviseOpen(false);
        resetReviseForm();
        startTransition(() => router.refresh());
      }
    } finally {
      setRevisePending(false);
    }
  }

  async function handleFinalizeSubmit(formData: FormData) {
    setFinalizePending(true);
    try {
      const result = await finalizeAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setFinalizeOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setFinalizePending(false);
    }
  }

  async function handleUpload(formData: FormData) {
    setUploadPending(true);
    try {
      const result = await uploadAttachmentAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) startTransition(() => router.refresh());
    } finally {
      setUploadPending(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    const formData = new FormData();
    formData.set("attachment_id", attachmentId);
    formData.set("staff_contract_id", contractId);
    const result = await deleteAttachmentAction(formData);
    triggerClientFeedback("settings", result.code);
    if (result.ok) startTransition(() => router.refresh());
  }

  async function handleDownload(attachmentId: string) {
    const url = await signAttachmentUrl(attachmentId);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return {
    // revise modal state
    reviseOpen,
    setReviseOpen,
    revisePending,
    closeReviseModal,
    handleReviseSubmit,

    // revise form fields
    amountInput,
    setAmountInput,
    percentInput,
    setPercentInput,
    calcMode,
    setCalcMode,
    motivoKey,
    setMotivoKey,
    observations,
    setObservations,

    // finalize
    finalizeOpen,
    setFinalizeOpen,
    finalizePending,
    handleFinalizeSubmit,

    // attachments
    uploadPending,
    handleUpload,
    handleDelete,
    handleDownload,
  };
}

export type ContractDetailController = ReturnType<typeof useContractDetail>;
