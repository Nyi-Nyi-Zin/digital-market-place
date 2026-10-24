"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export function ConfirmAction({
  children,
  title,
  description,
  actionLabel,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
  onCloseAutoFocus,
}: {
  children?: React.ReactElement;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  return (
    <AlertDialog
      open={open}
      onOpenChange={value => {
        if (!pending) setOpen(value);
      }}
    >
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={async event => {
              event.preventDefault();
              setPending(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch {
                // The mutation cache displays the Sonner error; keep the dialog open for retry.
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? t("Please wait…") : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
