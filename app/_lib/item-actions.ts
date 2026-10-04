import { ItemActionGroup, ItemActionId } from "@/app/_types/enums";

export interface ItemAction {
  id: ItemActionId;
  icon: string;
  label: string;
  hint: string;
  group: ItemActionGroup;
  run: () => void;
}

export interface ItemHandlers {
  onOpen?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onEncrypt?: () => void;
  onDecrypt?: () => void;
}

type ActionBlueprint = Omit<ItemAction, "run"> & { run?: () => void };

export const buildActions = (
  handlers: ItemHandlers,
  isEncrypted: boolean
): ItemAction[] => {
  const blueprints: ActionBlueprint[] = [
    {
      id: ItemActionId.OPEN,
      icon: "open_in_new",
      label: "Open",
      hint: "Open preview",
      group: ItemActionGroup.BASIC,
      run: handlers.onOpen,
    },
    {
      id: ItemActionId.RENAME,
      icon: "edit",
      label: "Rename",
      hint: "Rename",
      group: ItemActionGroup.BASIC,
      run: handlers.onRename,
    },
    {
      id: ItemActionId.MOVE,
      icon: "drive_file_move",
      label: "Move",
      hint: "Move to another folder",
      group: ItemActionGroup.BASIC,
      run: handlers.onMove,
    },
    {
      id: ItemActionId.DOWNLOAD,
      icon: "download",
      label: "Download",
      hint: "Download",
      group: ItemActionGroup.BASIC,
      run: handlers.onDownload,
    },
    {
      id: ItemActionId.DECRYPT,
      icon: "lock_open",
      label: "Decrypt",
      hint: "Decrypt with your PGP key",
      group: ItemActionGroup.CRYPTO,
      run: isEncrypted ? handlers.onDecrypt : undefined,
    },
    {
      id: ItemActionId.ENCRYPT,
      icon: "lock",
      label: "Encrypt",
      hint: "Encrypt with PGP",
      group: ItemActionGroup.CRYPTO,
      run: isEncrypted ? undefined : handlers.onEncrypt,
    },
    {
      id: ItemActionId.DELETE,
      icon: "delete",
      label: "Delete",
      hint: "Delete",
      group: ItemActionGroup.DANGER,
      run: handlers.onDelete,
    },
  ];

  return blueprints.filter((action): action is ItemAction => !!action.run);
};
