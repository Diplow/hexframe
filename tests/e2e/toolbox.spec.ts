import { test, expect } from '@playwright/test'

test.describe('Toolbox Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the map page
    await page.goto('http://localhost:3000/map')
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="map-canvas"]')
  })

  test.describe('Toolbox Display', () => {
    test('toolbox is hidden by default', async ({ page }) => {
      // Toggle button should be visible
      await expect(page.getByRole('button', { name: /toggle toolbox/i })).toBeVisible()
      
      // Tool buttons should not be visible
      await expect(page.getByRole('button', { name: /navigate tool/i })).not.toBeVisible()
      await expect(page.getByRole('button', { name: /create tool/i })).not.toBeVisible()
    })

    test('toolbox toggles through states: closed -> icons -> full -> icons -> closed', async ({ page }) => {
      const toggleButton = page.getByRole('button', { name: /toggle toolbox/i })
      
      // Click to open to icons mode
      await toggleButton.click()
      await expect(page.getByRole('button', { name: /navigate tool/i })).toBeVisible()
      await expect(page.locator('text=Navigate')).not.toBeVisible()
      
      // Click to open to full mode
      await toggleButton.click()
      await expect(page.locator('text=Navigate')).toBeVisible()
      await expect(page.locator('span:has-text("N")').first()).toBeVisible() // Shortcut badge
      
      // Click to go back to icons mode
      await toggleButton.click()
      await expect(page.getByRole('button', { name: /navigate tool/i })).toBeVisible()
      await expect(page.locator('text=Navigate')).not.toBeVisible()
      
      // Click to close
      await toggleButton.click()
      await expect(page.getByRole('button', { name: /navigate tool/i })).not.toBeVisible()
    })
  })

  test.describe('Tool Selection', () => {
    test('clicking tools changes active tool', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Click edit tool
      const editTool = page.getByRole('button', { name: /edit tool/i })
      await editTool.click()
      
      // Edit tool should be active
      await expect(editTool).toHaveAttribute('aria-pressed', 'true')
      
      // Click create tool
      const createTool = page.getByRole('button', { name: /create tool/i })
      await createTool.click()
      
      // Create tool should be active, edit tool should not
      await expect(createTool).toHaveAttribute('aria-pressed', 'true')
      await expect(editTool).toHaveAttribute('aria-pressed', 'false')
    })

    test('active tool persists when toggling toolbox', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Select delete tool
      await page.getByRole('button', { name: /delete tool/i }).click()
      
      // Close and reopen toolbox
      const toggleButton = page.getByRole('button', { name: /toggle toolbox/i })
      await toggleButton.click() // Close
      await toggleButton.click() // Open
      
      // Delete tool should still be active
      await expect(page.getByRole('button', { name: /delete tool/i })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test('keyboard shortcuts switch tools', async ({ page }) => {
      // Open toolbox to see visual feedback
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Press 'C' for create tool
      await page.keyboard.press('c')
      await expect(page.getByRole('button', { name: /create tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Press 'E' for edit tool
      await page.keyboard.press('e')
      await expect(page.getByRole('button', { name: /edit tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Press 'D' for delete tool
      await page.keyboard.press('d')
      await expect(page.getByRole('button', { name: /delete tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Press 'N' for navigate tool
      await page.keyboard.press('n')
      await expect(page.getByRole('button', { name: /navigate tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Press 'M' for move (drag) tool
      await page.keyboard.press('m')
      await expect(page.getByRole('button', { name: /move tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Press 'X' for expand tool
      await page.keyboard.press('x')
      await expect(page.getByRole('button', { name: /expand tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Press 'Escape' to return to select mode
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: /navigate tool/i })).toHaveAttribute('aria-pressed', 'true')
    })

    test('shortcuts work with uppercase letters', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Press uppercase 'C'
      await page.keyboard.press('C')
      await expect(page.getByRole('button', { name: /create tool/i })).toHaveAttribute('aria-pressed', 'true')
    })

    test('shortcuts ignored when typing in input', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Create a tile with editable content
      await page.evaluate(() => {
        const input = document.createElement('input')
        input.id = 'test-input'
        document.body.appendChild(input)
      })
      
      // Focus the input
      await page.locator('#test-input').focus()
      
      // Type 'c' in the input
      await page.keyboard.type('c')
      
      // Navigate tool should still be active (default)
      await expect(page.getByRole('button', { name: /navigate tool/i })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: /create tool/i })).toHaveAttribute('aria-pressed', 'false')
      
      // Cleanup
      await page.evaluate(() => {
        document.getElementById('test-input')?.remove()
      })
    })
  })

  test.describe('Tool Interactions', () => {
    test('different tools show different cursors', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      const canvas = page.locator('[data-testid="map-canvas"]')
      
      // Navigate tool (default)
      await expect(canvas).toHaveCSS('cursor', 'pointer')
      
      // Create tool
      await page.getByRole('button', { name: /create tool/i }).click()
      await expect(canvas).toHaveCSS('cursor', 'crosshair')
      
      // Edit tool
      await page.getByRole('button', { name: /edit tool/i }).click()
      await expect(canvas).toHaveCSS('cursor', 'text')
      
      // Delete tool
      await page.getByRole('button', { name: /delete tool/i }).click()
      await expect(canvas).toHaveCSS('cursor', 'not-allowed')
    })

    test('clicking tiles with different tools', async ({ page }) => {
      // Create mock tiles
      await page.evaluate(() => {
        // Mock tile data
        window.localStorage.setItem('hexframe-map-data', JSON.stringify({
          tiles: [
            { id: 'tile-1', position: { x: 0, y: 0 }, type: 'item', content: 'Test Tile 1' },
            { id: 'tile-2', position: { x: 1, y: 0 }, type: 'empty' },
          ],
          center: { x: 0, y: 0 },
        }))
      })
      
      // Reload to apply mock data
      await page.reload()
      await page.waitForSelector('[data-testid="map-canvas"]')
      
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Test navigate tool (default)
      const tile = page.locator('text=Test Tile 1').first()
      await tile.click()
      
      // Should navigate (check URL or navigation indicator)
      await expect(page).toHaveURL(/path=0,0/)
      
      // Go back
      await page.goBack()
      
      // Switch to edit tool and click
      await page.getByRole('button', { name: /edit tool/i }).click()
      await tile.click()
      
      // Should show edit UI (implementation dependent)
      // This would need to be adjusted based on actual implementation
      
      // Switch to create tool and click empty tile
      await page.getByRole('button', { name: /create tool/i }).click()
      const emptyTile = page.locator('[data-testid="tile-2"]')
      await emptyTile.click()
      
      // Should show create UI (implementation dependent)
    })
  })

  test.describe('Accessibility', () => {
    test('toolbox is keyboard navigable', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Tab to first tool
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /navigate tool/i })).toBeFocused()
      
      // Tab through all tools
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /expand tool/i })).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /create tool/i })).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /edit tool/i })).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /move tool/i })).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /delete tool/i })).toBeFocused()
      
      // Activate with Enter
      await page.keyboard.press('Enter')
      await expect(page.getByRole('button', { name: /delete tool/i })).toHaveAttribute('aria-pressed', 'true')
      
      // Activate with Space
      await page.getByRole('button', { name: /create tool/i }).focus()
      await page.keyboard.press(' ')
      await expect(page.getByRole('button', { name: /create tool/i })).toHaveAttribute('aria-pressed', 'true')
    })

    test('toolbox has proper ARIA attributes', async ({ page }) => {
      // Toggle button
      const toggleButton = page.getByRole('button', { name: /toggle toolbox/i })
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      
      // Open toolbox
      await toggleButton.click()
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      
      // Toolbar role
      await expect(page.getByRole('toolbar')).toBeVisible()
      
      // Tool buttons have aria-pressed
      const navigateTool = page.getByRole('button', { name: /navigate tool/i })
      await expect(navigateTool).toHaveAttribute('aria-pressed', 'true')
      
      const createTool = page.getByRole('button', { name: /create tool/i })
      await expect(createTool).toHaveAttribute('aria-pressed', 'false')
    })
  })

  test.describe('Visual States', () => {
    test('hover states show shortcuts in icons mode', async ({ page }) => {
      // Open to icons mode
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Hover over navigate tool
      const navigateTool = page.getByRole('button', { name: /navigate tool/i })
      await navigateTool.hover()
      
      // Should show tooltip with shortcut
      await expect(page.locator('text=Press N')).toBeVisible()
      
      // Move away
      await page.mouse.move(0, 0)
      await expect(page.locator('text=Press N')).not.toBeVisible()
    })

    test('full mode shows labels and shortcuts', async ({ page }) => {
      // Open to full mode (two clicks)
      const toggleButton = page.getByRole('button', { name: /toggle toolbox/i })
      await toggleButton.click()
      await toggleButton.click()
      
      // All labels and shortcuts should be visible
      await expect(page.locator('text=Navigate')).toBeVisible()
      await expect(page.locator('span:has-text("N")').first()).toBeVisible()
      await expect(page.locator('text=Expand')).toBeVisible()
      await expect(page.locator('span:has-text("X")').first()).toBeVisible()
      await expect(page.locator('text=Create')).toBeVisible()
      await expect(page.locator('span:has-text("C")').first()).toBeVisible()
      await expect(page.locator('text=Edit')).toBeVisible()
      await expect(page.locator('span:has-text("E")').first()).toBeVisible()
      await expect(page.locator('text=Move')).toBeVisible()
      await expect(page.locator('span:has-text("M")').first()).toBeVisible()
      await expect(page.locator('text=Delete')).toBeVisible()
      await expect(page.locator('span:has-text("D")').first()).toBeVisible()
    })

    test('active tool has visual highlight', async ({ page }) => {
      // Open toolbox
      await page.getByRole('button', { name: /toggle toolbox/i }).click()
      
      // Navigate tool should be highlighted by default
      const navigateTool = page.getByRole('button', { name: /navigate tool/i })
      await expect(navigateTool).toHaveClass(/bg-blue-500|border-blue-500|ring-blue-500/)
      
      // Click create tool
      const createTool = page.getByRole('button', { name: /create tool/i })
      await createTool.click()
      
      // Create tool should be highlighted, navigate should not
      await expect(createTool).toHaveClass(/bg-blue-500|border-blue-500|ring-blue-500/)
      await expect(navigateTool).not.toHaveClass(/bg-blue-500|border-blue-500|ring-blue-500/)
    })
  })
})