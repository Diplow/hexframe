// Re-export resolution utilities
export {
  resolveItemIdentifier,
  loadSiblingsForItem,
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-resolution";

// Re-export state update utilities
export {
  updateExpandedItemsForNavigation,
  handleURLUpdate,
  performBackgroundTasks,
} from "~/app/map/Cache/Handlers/NavigationHandler/navigation-state-updates";