import { Play } from "lucide-react"
import type { MenuItem } from "~/app/map/Canvas/Menu/items-builder"
import type { TileData } from "~/app/map/types/tile-data"
import { MapItemType, isCustomItemType, type ItemTypeValue } from "~/lib/domains/mapping/utils"

/**
 * Run-related menu item builder for SYSTEM tiles
 *
 * The Run action allows executing SYSTEM tiles via the agentic.run endpoint.
 * Only SYSTEM tiles and tiles with custom types can be run.
 */

export function _buildRunItem(
  tileData: TileData,
  canEdit: boolean,
  onRun?: () => void
): MenuItem[] {
  if (!onRun || !canEdit) return []

  const itemType = tileData.data.itemType as ItemTypeValue | null
  const isSystemTile = itemType === MapItemType.SYSTEM
  const isCustomTypeTile = itemType !== null && isCustomItemType(itemType)

  if (!isSystemTile && !isCustomTypeTile) return []

  return [
    {
      icon: Play,
      label: "Run",
      shortcut: "",
      onClick: onRun,
      separator: true,
    },
  ]
}
