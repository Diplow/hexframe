import { Lock, Unlock, Eye, Clipboard, History } from "lucide-react";
import { Visibility } from '~/lib/domains/mapping/utils';
import type { MenuItem } from "~/app/map/Canvas/Menu/items-builder";

/**
 * Visibility and utility menu item builders
 */

interface VisibilitySubmenuCallbacks {
  onSetVisibility?: (visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (visibility: Visibility) => void;
}

export function _buildVisibilitySubmenu(
  canEdit: boolean,
  visibility: Visibility | undefined,
  callbacks: VisibilitySubmenuCallbacks,
): MenuItem[] {
  const { onSetVisibility, onSetVisibilityWithDescendants } = callbacks;

  if (!canEdit || !visibility) return [];
  if (!onSetVisibility && !onSetVisibilityWithDescendants) return [];

  const isPrivate = visibility === Visibility.PRIVATE;
  const targetVisibility = isPrivate ? Visibility.PUBLIC : Visibility.PRIVATE;
  const actionLabel = isPrivate ? "Public" : "Private";

  const submenuItems: MenuItem[] = [];

  if (onSetVisibility) {
    submenuItems.push({
      icon: isPrivate ? Unlock : Lock,
      label: `Make ${actionLabel}`,
      shortcut: "",
      onClick: () => onSetVisibility(targetVisibility),
    });
  }

  if (onSetVisibilityWithDescendants) {
    submenuItems.push({
      icon: isPrivate ? Unlock : Lock,
      label: `Make ${actionLabel} (with descendants)`,
      shortcut: "",
      onClick: () => onSetVisibilityWithDescendants(targetVisibility),
    });
  }

  // If only one option, return it directly without submenu
  if (submenuItems.length === 1) {
    return submenuItems;
  }

  // Multiple options: create submenu
  return [
    {
      icon: Eye,
      label: "Visibility",
      shortcut: "",
      submenu: submenuItems,
    },
  ];
}

// Backward compatible function - deprecated, use _buildVisibilitySubmenu instead
export function _buildVisibilityItem(
  canEdit: boolean,
  visibility: Visibility | undefined,
  onToggleVisibility?: () => void,
): MenuItem[] {
  if (!canEdit || !onToggleVisibility || !visibility) return [];

  const isPrivate = visibility === Visibility.PRIVATE;
  return [
    {
      icon: isPrivate ? Unlock : Lock,
      label: isPrivate ? "Make Public" : "Make Private",
      shortcut: "",
      onClick: onToggleVisibility,
    },
  ];
}

export function _buildViewHistoryItem(onViewHistory?: () => void): MenuItem[] {
  return onViewHistory
    ? [
        {
          icon: History,
          label: "View History",
          shortcut: "",
          onClick: onViewHistory,
        },
      ]
    : [];
}

export function _buildCopyCoordinatesItem(
  onCopyCoordinates?: () => void,
): MenuItem[] {
  return onCopyCoordinates
    ? [
        {
          icon: Clipboard,
          label: "Copy Coordinates",
          shortcut: "",
          onClick: onCopyCoordinates,
        },
      ]
    : [];
}
