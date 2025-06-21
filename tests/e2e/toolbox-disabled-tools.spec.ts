import { test, expect } from '@playwright/test'

test.describe('Toolbox - Disabled Tools', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for each test
  });

  test('disables create, edit, and delete tools when navigating to non-owned space', async ({ page }) => {
    // Start at user 1's root space
    await page.goto('/map?center=1');
    await page.waitForLoadState('networkidle');

    // Open the toolbox
    await page.getByRole('button', { name: /toggle toolbox/i }).click();
    
    // Verify create, edit, and delete tools are enabled in own space
    const createToolInOwnSpace = page.getByRole('button', { name: /^create tool$/i });
    const editToolInOwnSpace = page.getByRole('button', { name: /^edit tool$/i });
    const deleteToolInOwnSpace = page.getByRole('button', { name: /^delete tool$/i });
    await expect(createToolInOwnSpace).toBeEnabled();
    await expect(editToolInOwnSpace).toBeEnabled();
    await expect(deleteToolInOwnSpace).toBeEnabled();
    await expect(createToolInOwnSpace).not.toHaveAttribute('aria-disabled', 'true');
    await expect(editToolInOwnSpace).not.toHaveAttribute('aria-disabled', 'true');
    await expect(deleteToolInOwnSpace).not.toHaveAttribute('aria-disabled', 'true');

    // Navigate to user 2's space by clicking on a tile that leads there
    // First find a tile that represents user 2's space
    await page.getByTestId('item-tile-2').click();
    await page.waitForURL(/center=2/);
    
    // Check that create, edit, and delete tools are now disabled
    const createToolInOtherSpace = page.getByRole('button', { name: /create tool \(disabled\)/i });
    const editToolInOtherSpace = page.getByRole('button', { name: /edit tool \(disabled\)/i });
    const deleteToolInOtherSpace = page.getByRole('button', { name: /delete tool \(disabled\)/i });
    await expect(createToolInOtherSpace).toBeDisabled();
    await expect(editToolInOtherSpace).toBeDisabled();
    await expect(deleteToolInOtherSpace).toBeDisabled();
    await expect(createToolInOtherSpace).toHaveAttribute('aria-disabled', 'true');
    await expect(editToolInOtherSpace).toHaveAttribute('aria-disabled', 'true');
    await expect(deleteToolInOtherSpace).toHaveAttribute('aria-disabled', 'true');
    
    // Verify navigate and expand tools are still enabled
    const navigateTool = page.getByRole('button', { name: /^navigate tool$/i });
    const expandTool = page.getByRole('button', { name: /^expand tool$/i });
    await expect(navigateTool).toBeEnabled();
    await expect(expandTool).toBeEnabled();
    
    // Try clicking the disabled edit tool
    await editToolInOtherSpace.click({ force: true });
    
    // Verify it doesn't activate (navigate tool should still be active)
    await expect(navigateTool).toHaveAttribute('aria-pressed', 'true');
  });

  test('enables all tools when returning to owned space', async ({ page }) => {
    // Start at user 2's space (not owned by user 1)
    await page.goto('/map?center=2');
    await page.waitForLoadState('networkidle');

    // Open the toolbox
    await page.getByRole('button', { name: /toggle toolbox/i }).click();
    
    // Verify create, edit, and delete tools are disabled
    const createToolDisabled = page.getByRole('button', { name: /create tool \(disabled\)/i });
    const editToolDisabled = page.getByRole('button', { name: /edit tool \(disabled\)/i });
    const deleteToolDisabled = page.getByRole('button', { name: /delete tool \(disabled\)/i });
    await expect(createToolDisabled).toBeDisabled();
    await expect(editToolDisabled).toBeDisabled();
    await expect(deleteToolDisabled).toBeDisabled();

    // Navigate back to user 1's space
    await page.getByTestId('item-tile-1').click();
    await page.waitForURL(/center=1/);
    
    // Check that all tools are now enabled
    const createToolEnabled = page.getByRole('button', { name: /^create tool$/i });
    const editToolEnabled = page.getByRole('button', { name: /^edit tool$/i });
    const deleteToolEnabled = page.getByRole('button', { name: /^delete tool$/i });
    await expect(createToolEnabled).toBeEnabled();
    await expect(editToolEnabled).toBeEnabled();
    await expect(deleteToolEnabled).toBeEnabled();
    await expect(createToolEnabled).not.toHaveAttribute('aria-disabled', 'true');
    await expect(editToolEnabled).not.toHaveAttribute('aria-disabled', 'true');
    await expect(deleteToolEnabled).not.toHaveAttribute('aria-disabled', 'true');
    
    // Verify we can select the edit tool
    await editToolEnabled.click();
    await expect(editToolEnabled).toHaveAttribute('aria-pressed', 'true');
  });

  test('tools remain disabled while navigating within non-owned space', async ({ page }) => {
    // Start at user 2's space (not owned by user 1)
    await page.goto('/map?center=2');
    await page.waitForLoadState('networkidle');

    // Open the toolbox
    await page.getByRole('button', { name: /toggle toolbox/i }).click();
    
    // Verify create, edit, and delete tools are disabled
    let createTool = page.getByRole('button', { name: /create tool \(disabled\)/i });
    let editTool = page.getByRole('button', { name: /edit tool \(disabled\)/i });
    let deleteTool = page.getByRole('button', { name: /delete tool \(disabled\)/i });
    await expect(createTool).toBeDisabled();
    await expect(editTool).toBeDisabled();
    await expect(deleteTool).toBeDisabled();

    // Navigate to a child tile within user 2's space
    const childTile = page.getByTestId(/^item-tile-2-/).first();
    if (await childTile.isVisible()) {
      await childTile.click();
      await page.waitForTimeout(500); // Wait for navigation
      
      // Verify tools are still disabled
      createTool = page.getByRole('button', { name: /create tool \(disabled\)/i });
      editTool = page.getByRole('button', { name: /edit tool \(disabled\)/i });
      deleteTool = page.getByRole('button', { name: /delete tool \(disabled\)/i });
      await expect(createTool).toBeDisabled();
      await expect(editTool).toBeDisabled();
      await expect(deleteTool).toBeDisabled();
    }
  });

  test('visual styling of disabled tools', async ({ page }) => {
    // Navigate to non-owned space
    await page.goto('/map?center=2');
    await page.waitForLoadState('networkidle');

    // Open the toolbox fully to see all labels
    const toggleButton = page.getByRole('button', { name: /toggle toolbox/i });
    await toggleButton.click(); // Open to icons
    await toggleButton.click(); // Open to full
    
    // Check visual styling of disabled tools
    const createTool = page.getByRole('button', { name: /create tool \(disabled\)/i });
    const editTool = page.getByRole('button', { name: /edit tool \(disabled\)/i });
    const deleteTool = page.getByRole('button', { name: /delete tool \(disabled\)/i });
    
    // Verify opacity is reduced (disabled state)
    await expect(createTool).toHaveCSS('opacity', '0.5');
    await expect(editTool).toHaveCSS('opacity', '0.5');
    await expect(deleteTool).toHaveCSS('opacity', '0.5');
    
    // Verify cursor is not-allowed
    await expect(createTool).toHaveCSS('cursor', 'not-allowed');
    await expect(editTool).toHaveCSS('cursor', 'not-allowed');
    await expect(deleteTool).toHaveCSS('cursor', 'not-allowed');
    
    // Compare with enabled tools
    const navigateTool = page.getByRole('button', { name: /^navigate tool$/i });
    const expandTool = page.getByRole('button', { name: /^expand tool$/i });
    await expect(navigateTool).toHaveCSS('opacity', '1');
    await expect(expandTool).toHaveCSS('opacity', '1');
    await expect(navigateTool).toHaveCSS('cursor', 'pointer');
    await expect(expandTool).toHaveCSS('cursor', 'pointer');
  });
});