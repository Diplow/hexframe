import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import type { ReactNode } from 'react'
import React from 'react'

// Mock the TileActionsContext
const mockSetActiveTool = vi.fn()
vi.mock('../Canvas/TileActionsContext', () => ({
  useTileActions: () => ({
    activeTool: 'select',
    setActiveTool: mockSetActiveTool,
  }),
}))

describe('useKeyboardShortcuts', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    mockSetActiveTool.mockClear()
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  // Wrapper is not needed since we're mocking the context
  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>

  describe('Event Listener Management', () => {
    it('registers keyboard event listener on mount', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
    })

    it('removes keyboard event listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(), { wrapper })

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
    })

    it('uses the same function reference for add and remove', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(), { wrapper })

      const addedHandler = addEventListenerSpy.mock.calls[0]?.[1]
      unmount()
      const removedHandler = removeEventListenerSpy.mock.calls[0]?.[1]

      expect(addedHandler).toBe(removedHandler)
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('triggers tool changes with correct shortcuts', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Test 'N' for navigate
      handler(new KeyboardEvent('keydown', { key: 'n' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('navigate')

      // Test 'X' for expand
      handler(new KeyboardEvent('keydown', { key: 'x' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('expand')
      
      // Test 'C' for create
      handler(new KeyboardEvent('keydown', { key: 'c' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('create')

      // Test 'E' for edit
      handler(new KeyboardEvent('keydown', { key: 'e' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('edit')

      // Test 'D' for delete
      handler(new KeyboardEvent('keydown', { key: 'd' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('delete')

      // Test 'M' for drag
      handler(new KeyboardEvent('keydown', { key: 'm' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('drag')

      // Test 'Escape' for expand (default)
      handler(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('expand')
    })

    it('handles uppercase letters', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Test uppercase 'N'
      handler(new KeyboardEvent('keydown', { key: 'N' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('navigate')

      // Test uppercase 'X'
      handler(new KeyboardEvent('keydown', { key: 'X' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('expand')
      
      // Test uppercase 'C'
      handler(new KeyboardEvent('keydown', { key: 'C' }))
      expect(mockSetActiveTool).toHaveBeenCalledWith('create')
    })

    it('ignores shortcuts when modifier keys are pressed', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Test with Ctrl
      handler(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }))
      expect(mockSetActiveTool).not.toHaveBeenCalled()

      // Test with Alt
      handler(new KeyboardEvent('keydown', { key: 'c', altKey: true }))
      expect(mockSetActiveTool).not.toHaveBeenCalled()

      // Test with Meta (Cmd on Mac)
      handler(new KeyboardEvent('keydown', { key: 'e', metaKey: true }))
      expect(mockSetActiveTool).not.toHaveBeenCalled()
    })
  })

  describe('Input Field Conflicts', () => {
    it('ignores shortcuts when typing in input fields', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Create and focus an input element
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      // Trigger shortcut while input is focused
      const event = new KeyboardEvent('keydown', { key: 'n' })
      Object.defineProperty(event, 'target', { value: input })
      handler(event)

      expect(mockSetActiveTool).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(input)
    })

    it('ignores shortcuts when typing in textarea', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Create and focus a textarea
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      // Trigger shortcut while textarea is focused
      const event = new KeyboardEvent('keydown', { key: 'c' })
      Object.defineProperty(event, 'target', { value: textarea })
      handler(event)

      expect(mockSetActiveTool).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(textarea)
    })

    it('ignores shortcuts in contenteditable elements', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Create and focus a contenteditable div
      const div = document.createElement('div')
      div.contentEditable = 'true'
      document.body.appendChild(div)
      div.focus()

      // Trigger shortcut while contenteditable is focused
      const event = new KeyboardEvent('keydown', { key: 'e' })
      Object.defineProperty(event, 'target', { value: div })
      handler(event)

      expect(mockSetActiveTool).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(div)
    })

    it('allows shortcuts when not in editable fields', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      // Focus on body (non-editable)
      document.body.focus()

      // Trigger shortcut
      const event = new KeyboardEvent('keydown', { key: 'n' })
      Object.defineProperty(event, 'target', { value: document.body })
      handler(event)

      expect(mockSetActiveTool).toHaveBeenCalledWith('navigate')
    })
  })

  describe('Performance', () => {
    it('prevents default behavior for handled shortcuts', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      const event = new KeyboardEvent('keydown', { key: 'n' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handler(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('does not prevent default for unhandled keys', () => {
      renderHook(() => useKeyboardShortcuts(), { wrapper })

      const handler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener

      const event = new KeyboardEvent('keydown', { key: 'z' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handler(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })
})