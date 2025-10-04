/**
 * Expanded items storage operations
 * Built on top of generic save/load operations
 */
export function _createExpandedItemsOperations(
  save: (key: string, data: unknown) => Promise<void>,
  load: <T = unknown>(key: string) => Promise<T | null>
) {
  const saveExpandedItems = async (expandedItems: string[]): Promise<void> => {
    return save('expanded-items', expandedItems);
  };

  const loadExpandedItems = async (): Promise<string[]> => {
    const items = await load<string[]>('expanded-items');
    return items ?? [];
  };

  return {
    saveExpandedItems,
    loadExpandedItems,
  };
}
