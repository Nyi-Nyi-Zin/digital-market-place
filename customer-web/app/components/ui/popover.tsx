"use client";
import * as React from "react";
import { Popover as Primitive } from "radix-ui";
export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export function PopoverContent({
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="popover-content"
        sideOffset={8}
        collisionPadding={12}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
