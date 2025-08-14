/**
 * Represents all possible interaction states for a tile
 * Used to manage visual feedback during user interactions
 */
export interface TileInteractionState {
  /** True when tile is being dragged */
  isDragged: boolean;
  
  /** True when mouse is hovering over the tile */
  isHovered: boolean;
  
  /** True when tile is selected (e.g., for keyboard operations) */
  isSelected: boolean;
  
  /** True when tile is expanded to show children */
  isExpanded: boolean;
  
  /** True when another tile is being dragged over this tile */
  isDragOver: boolean;
  
  /** True when this tile is hovering over another tile during drag */
  isHovering: boolean;
}