"use client";

import { useRef } from "react";
import { EllipsisVertical, Pencil, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "./ui/button";
import { useI18n } from "./I18nProvider";

export function RowActions({
  name,
  editLabel,
  disabled,
  onEdit,
  destructiveAction,
}: {
  name: string;
  editLabel: string;
  disabled: boolean;
  onEdit: (trigger: HTMLButtonElement | null) => void;
  destructiveAction?: {
    label: string;
    icon: LucideIcon;
    onSelect: (trigger: HTMLButtonElement | null) => void;
  };
}) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  const DestructiveIcon = destructiveAction?.icon;

  return (
    <DropdownMenu.Root
      onOpenChange={open => {
        if (open) openingDialog.current = false;
      }}
    >
      <DropdownMenu.Trigger asChild>
        <Button
          ref={triggerRef}
          variant="brand"
          size="brand"
          type="button"
          className="row-action-trigger"
          aria-label={`${t("Actions")}: ${name}`}
          disabled={disabled}
        >
          <EllipsisVertical size={18} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="row-action-menu"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onCloseAutoFocus={event => {
            // The selected dialog takes focus and returns it to this row on close.
            if (openingDialog.current) event.preventDefault();
          }}
        >
          <DropdownMenu.Item
            className="row-action-item"
            disabled={disabled}
            onSelect={() => {
              openingDialog.current = true;
              onEdit(triggerRef.current);
            }}
          >
            <Pencil size={16} aria-hidden="true" />
            {editLabel}
          </DropdownMenu.Item>
          {destructiveAction && DestructiveIcon && (
            <>
              <DropdownMenu.Separator className="row-action-separator" />
              <DropdownMenu.Item
                className="row-action-item row-action-danger"
                disabled={disabled}
                onSelect={() => {
                  openingDialog.current = true;
                  destructiveAction.onSelect(triggerRef.current);
                }}
              >
                <DestructiveIcon size={16} aria-hidden="true" />
                {destructiveAction.label}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
