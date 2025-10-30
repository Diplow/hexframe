import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalDragService } from '~/app/map/Services/DragAndDrop/GlobalDragService';
import type { DropHandler, ValidationHandler } from '~/app/map/Services/DragAndDrop/GlobalDragService';

// Polyfill DragEvent for test environment (JSDOM doesn't provide it)
if (typeof DragEvent === 'undefined') {
  (global as unknown as { DragEvent: typeof Event }).DragEvent = class DragEvent extends Event {
    dataTransfer: DataTransfer | null = null;
    ctrlKey = false;

    constructor(type: string, eventInitDict?: DragEventInit) {
      super(type, eventInitDict);
      if (eventInitDict) {
        this.ctrlKey = eventInitDict.ctrlKey ?? false;
      }
    }
  } as typeof Event;
}

interface DragEventInit extends EventInit {
  ctrlKey?: boolean;
  dataTransfer?: DataTransfer | null;
}

describe('GlobalDragService - Ctrl Key Detection and Copy/Move Operations', () => {
  let mockDropHandler: DropHandler;
  let mockValidationHandler: ValidationHandler;
  let mockDragEvent: DragEvent;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';

    // Reset singleton instance state by initializing with fresh handlers
    mockDropHandler = vi.fn().mockResolvedValue(undefined);
    mockValidationHandler = vi.fn().mockReturnValue({ isValid: true });

    globalDragService.initialize({
      dropHandler: mockDropHandler,
      validationHandler: mockValidationHandler,
      currentUserId: 1
    });

    // Create mock drag event with dataTransfer
    mockDragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true
    });

    // Mock dataTransfer
    Object.defineProperty(mockDragEvent, 'dataTransfer', {
      value: {
        effectAllowed: '',
        setData: vi.fn(),
        getData: vi.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    // Trigger dragend to reset service state
    document.dispatchEvent(new DragEvent('dragend'));
  });

  describe('Ctrl key state detection during drag', () => {
    it('should detect when ctrl key is NOT pressed during drag start (default copy operation)', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      document.body.appendChild(sourceElement);

      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        ctrlKey: false
      });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn(), getData: vi.fn() },
        writable: true
      });

      // Act
      globalDragService.startDrag('tile-1', dragEvent);

      // Assert
      expect(document.body.getAttribute('data-drag-active')).toBe('true');
      expect(sourceElement.getAttribute('data-being-dragged')).toBe('true');
      // Default operation should be 'copy' (ctrl NOT pressed)
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('copy');
    });

    it('should detect when ctrl key IS pressed during drag start (move operation)', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      document.body.appendChild(sourceElement);

      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true
      });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn(), getData: vi.fn() },
        writable: true
      });

      // Act
      globalDragService.startDrag('tile-1', dragEvent);

      // Assert
      expect(document.body.getAttribute('data-drag-active')).toBe('true');
      expect(sourceElement.getAttribute('data-being-dragged')).toBe('true');
      // With ctrl pressed, operation should be 'move'
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('move');
    });

    it('should track ctrl key state changes during dragover', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag without ctrl
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        ctrlKey: false
      });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn(), getData: vi.fn() },
        writable: true
      });
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Act - Dragover WITH ctrl key
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true
      });
      Object.defineProperty(dragOverEvent, 'target', {
        value: targetElement,
        writable: false
      });
      document.dispatchEvent(dragOverEvent);

      // Assert - Should update to 'move' operation
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('move');
      expect(targetElement.getAttribute('data-drop-target')).toBe('true');
      expect(targetElement.getAttribute('data-drop-operation')).toBe('move');
    });
  });

  describe('Operation type determination', () => {
    it('should determine operation as "copy" when ctrl key is not pressed (default)', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag without ctrl (default copy)
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Dragover without ctrl
      const dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Act - Drop
      const dropEvent = createDragEvent('drop', false, targetElement);
      document.dispatchEvent(dropEvent);

      // Assert
      expect(mockDropHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'tile-1',
          targetId: 'tile-2',
          operation: 'copy'
        })
      );
    });

    it('should determine operation as "move" when ctrl key is pressed', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag WITH ctrl (move)
      const dragStartEvent = createDragEvent('dragstart', true);
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Dragover with ctrl
      const dragOverEvent = createDragEvent('dragover', true, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Act - Drop with ctrl
      const dropEvent = createDragEvent('drop', true, targetElement);
      document.dispatchEvent(dropEvent);

      // Assert
      expect(mockDropHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'tile-1',
          targetId: 'tile-2',
          operation: 'move'
        })
      );
    });

    it('should maintain "copy" operation type when dragging to target with content (swap scenario)', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, true); // has content
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag without ctrl (copy)
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Dragover without ctrl
      const dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Act - Drop
      const dropEvent = createDragEvent('drop', false, targetElement);
      document.dispatchEvent(dropEvent);

      // Assert - Should be copy, NOT swap (copy is the operation type, swap is handled by backend)
      expect(mockDropHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'tile-1',
          targetId: 'tile-2',
          operation: 'copy'
        })
      );
    });
  });

  describe('CSS visual feedback for copy/move operations', () => {
    it('should apply "copy" CSS class to body and drop target for default drag (no ctrl)', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Act - Start drag without ctrl
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      const dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Assert
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('copy');
      expect(targetElement.getAttribute('data-drop-operation')).toBe('copy');
      // Blue visual feedback for copy is done via CSS, we just check the class is applied
    });

    it('should apply "move" CSS class to body and drop target when ctrl is pressed', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Act - Start drag with ctrl
      const dragStartEvent = createDragEvent('dragstart', true);
      globalDragService.startDrag('tile-1', dragStartEvent);

      const dragOverEvent = createDragEvent('dragover', true, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Assert
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('move');
      expect(targetElement.getAttribute('data-drop-operation')).toBe('move');
    });

    it('should update CSS classes when ctrl key state changes during drag', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag without ctrl (copy)
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      let dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('copy');

      // Act - Press ctrl during drag (switch to move)
      dragOverEvent = createDragEvent('dragover', true, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Assert
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('move');
      expect(targetElement.getAttribute('data-drop-operation')).toBe('move');

      // Act - Release ctrl (switch back to copy)
      dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Assert
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('copy');
      expect(targetElement.getAttribute('data-drop-operation')).toBe('copy');
    });

    it('should remove CSS classes when drag ends', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      const dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Verify classes are applied
      expect(document.body.getAttribute('data-drag-active')).toBe('true');
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('copy');

      // Act - End drag
      document.dispatchEvent(new DragEvent('dragend'));

      // Assert - All CSS classes removed
      expect(document.body.getAttribute('data-drag-active')).toBeNull();
      expect(document.body.getAttribute('data-drag-operation-type')).toBeNull();
      expect(targetElement.getAttribute('data-drop-target')).toBeNull();
      expect(targetElement.getAttribute('data-drop-operation')).toBeNull();
    });
  });

  describe('Drag handler routing with operation type', () => {
    it('should pass "copy" operation type to drop handler when ctrl is not pressed', async () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      const dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Act
      const dropEvent = createDragEvent('drop', false, targetElement);
      document.dispatchEvent(dropEvent);

      // Assert
      expect(mockDropHandler).toHaveBeenCalledTimes(1);
      expect(mockDropHandler).toHaveBeenCalledWith({
        sourceId: 'tile-1',
        targetId: 'tile-2',
        operation: 'copy'
      });
    });

    it('should pass "move" operation type to drop handler when ctrl is pressed', async () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      const dragStartEvent = createDragEvent('dragstart', true);
      globalDragService.startDrag('tile-1', dragStartEvent);

      const dragOverEvent = createDragEvent('dragover', true, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Act
      const dropEvent = createDragEvent('drop', true, targetElement);
      document.dispatchEvent(dropEvent);

      // Assert
      expect(mockDropHandler).toHaveBeenCalledTimes(1);
      expect(mockDropHandler).toHaveBeenCalledWith({
        sourceId: 'tile-1',
        targetId: 'tile-2',
        operation: 'move'
      });
    });

    it('should use the operation type from the final ctrl state at drop time', async () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // Start drag without ctrl (copy)
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Hover without ctrl
      let dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Change to ctrl during drag
      dragOverEvent = createDragEvent('dragover', true, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Act - Drop with ctrl pressed
      const dropEvent = createDragEvent('drop', true, targetElement);
      document.dispatchEvent(dropEvent);

      // Assert - Should use 'move' from final state
      expect(mockDropHandler).toHaveBeenCalledWith({
        sourceId: 'tile-1',
        targetId: 'tile-2',
        operation: 'move'
      });
    });
  });

  describe('DOM-centric architecture preservation', () => {
    it('should not use React state for ctrl key tracking', () => {
      // This test verifies the architecture principle: no React state
      // The service should use only DOM events and attributes

      const sourceElement = createTileElement('tile-1', 1, true);
      document.body.appendChild(sourceElement);

      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Assert - State is tracked via DOM attributes only
      expect(document.body.hasAttribute('data-drag-active')).toBe(true);
      expect(document.body.hasAttribute('data-drag-operation-type')).toBe(true);

      // No React state should be involved - the service is a singleton
      // with private fields, not a React component
      expect(globalDragService.isDragging()).toBe(true);
    });

    it('should handle ctrl key state purely through DOM events', () => {
      // Arrange
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      // All state changes happen through DOM events
      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      const dragOverEvent1 = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent1);
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('copy');

      const dragOverEvent2 = createDragEvent('dragover', true, targetElement);
      document.dispatchEvent(dragOverEvent2);
      expect(document.body.getAttribute('data-drag-operation-type')).toBe('move');

      // All state is in DOM, inspectable and controllable via events
    });
  });

  describe('Validation logic preservation', () => {
    it('should maintain ownership validation regardless of operation type', () => {
      // Arrange
      (mockValidationHandler as ReturnType<typeof vi.fn>).mockReturnValue({ isValid: false, reason: 'Not owned' });

      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement = createTileElement('tile-2', 2, false); // Different owner
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement);

      const dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      // Act - Try to drag over with copy operation
      const dragOverEvent = createDragEvent('dragover', false, targetElement);
      document.dispatchEvent(dragOverEvent);

      // Assert - Validation should be called and drop target should NOT be set
      expect(mockValidationHandler).toHaveBeenCalled();
      expect(targetElement.getAttribute('data-drop-target')).toBeNull();
    });

    it('should validate before setting drop target for both copy and move operations', () => {
      // Test copy operation validation
      const sourceElement = createTileElement('tile-1', 1, true);
      const targetElement1 = createTileElement('tile-2', 1, false);
      document.body.appendChild(sourceElement);
      document.body.appendChild(targetElement1);

      let dragStartEvent = createDragEvent('dragstart', false);
      globalDragService.startDrag('tile-1', dragStartEvent);

      let dragOverEvent = createDragEvent('dragover', false, targetElement1);
      document.dispatchEvent(dragOverEvent);

      expect(mockValidationHandler).toHaveBeenCalledWith('tile-1', 'tile-2', true, false);

      // End drag and clean up
      document.dispatchEvent(new DragEvent('dragend'));
      document.body.innerHTML = '';

      // Test move operation validation
      const sourceElement2 = createTileElement('tile-3', 1, true);
      const targetElement2 = createTileElement('tile-4', 1, false);
      document.body.appendChild(sourceElement2);
      document.body.appendChild(targetElement2);

      dragStartEvent = createDragEvent('dragstart', true);
      globalDragService.startDrag('tile-3', dragStartEvent);

      dragOverEvent = createDragEvent('dragover', true, targetElement2);
      document.dispatchEvent(dragOverEvent);

      expect(mockValidationHandler).toHaveBeenCalledWith('tile-3', 'tile-4', true, false);
    });
  });
});

// Helper functions

function createTileElement(tileId: string, ownerId: number, hasContent: boolean): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('data-tile-id', tileId);
  // Only set owner if tile has content (empty tiles have no owner)
  if (hasContent) {
    element.setAttribute('data-tile-owner', ownerId.toString());
  }
  element.setAttribute('data-tile-has-content', hasContent.toString());
  element.draggable = true;
  return element;
}

function createDragEvent(type: string, ctrlKey: boolean, target?: HTMLElement): DragEvent {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    ctrlKey
  });

  Object.defineProperty(event, 'dataTransfer', {
    value: {
      effectAllowed: '',
      setData: vi.fn(),
      getData: vi.fn()
    },
    writable: true
  });

  if (target) {
    Object.defineProperty(event, 'target', {
      value: target,
      writable: false
    });
  }

  return event;
}
