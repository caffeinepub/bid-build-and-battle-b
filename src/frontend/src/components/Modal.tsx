/**
 * Modal — reusable confirmation modal wrapping shadcn AlertDialog.
 * Premium dark look with navy background and optional destructive variant.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ModalProps) {
  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-ocid="modal.dialog"
        className="card-navy border-border/70 shadow-[0_8px_48px_oklch(0.05_0.01_255_/_0.8)]"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground font-semibold">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-muted-foreground">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-ocid="modal.cancel_button"
            onClick={handleCancel}
            className="bg-muted/50 text-foreground border-border hover:bg-muted"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            data-ocid="modal.confirm_button"
            onClick={handleConfirm}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "gradient-cyan-pink text-white hover:opacity-90"
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
