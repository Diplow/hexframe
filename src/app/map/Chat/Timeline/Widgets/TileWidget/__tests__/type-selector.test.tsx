import "~/test/setup";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// These imports will fail until implementation exists
// This is expected in TDD - tests are written first

describe("TypeSelectorField Component", () => {
  describe("rendering", () => {
    it("should render a dropdown with label 'Type'", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      render(
        <_TypeSelectorField
          value="context"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText("Type")).toBeInTheDocument();
    });

    it("should display three type options: Organizational, Context, System", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      render(
        <_TypeSelectorField
          value="context"
          onChange={vi.fn()}
        />
      );

      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      expect(screen.getByText("Organizational")).toBeInTheDocument();
      expect(screen.getByText("Context")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
    });

    it("should show the current value as selected", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      render(
        <_TypeSelectorField
          value="organizational"
          onChange={vi.fn()}
        />
      );

      // The select should show "Organizational" as the selected value
      expect(screen.getByRole("combobox")).toHaveTextContent("Organizational");
    });
  });

  describe("interaction", () => {
    it("should call onChange when a new type is selected", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      const handleChange = vi.fn();
      render(
        <_TypeSelectorField
          value="context"
          onChange={handleChange}
        />
      );

      const select = screen.getByRole("combobox");
      await userEvent.click(select);
      await userEvent.click(screen.getByText("System"));

      expect(handleChange).toHaveBeenCalledWith("system");
    });

    it("should not call onChange when same type is selected", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      const handleChange = vi.fn();
      render(
        <_TypeSelectorField
          value="context"
          onChange={handleChange}
        />
      );

      const select = screen.getByRole("combobox");
      await userEvent.click(select);
      await userEvent.click(screen.getByText("Context"));

      // onChange should not be called for same value
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      render(
        <_TypeSelectorField
          value="context"
          onChange={vi.fn()}
          disabled={true}
        />
      );

      expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("should not open dropdown when disabled", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      render(
        <_TypeSelectorField
          value="context"
          onChange={vi.fn()}
          disabled={true}
        />
      );

      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      // Options should not be visible
      expect(screen.queryByText("Organizational")).not.toBeInTheDocument();
    });
  });
});

describe("TileForm with TypeSelector", () => {
  // Mock tRPC before importing
  vi.mock("~/commons/trpc/react", () => ({
    api: {
      agentic: {
        generatePreview: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
          })),
        },
        getJobStatus: {
          useQuery: vi.fn(() => ({
            refetch: vi.fn(),
          })),
        },
      },
    },
  }));

  it("should include TypeSelectorField in the form", async () => {
    const { TileForm } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm"
    );

    render(
      <TileForm
        mode="create"
        title="Test Title"
        preview=""
        content=""
        itemType="context"
        onPreviewChange={vi.fn()}
        onContentChange={vi.fn()}
        onItemTypeChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Type")).toBeInTheDocument();
  });

  it("should hide TypeSelectorField when isUserTile is true", async () => {
    const { TileForm } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm"
    );

    render(
      <TileForm
        mode="edit"
        title="Root Tile"
        preview=""
        content=""
        itemType="user"
        isUserTile={true}
        onPreviewChange={vi.fn()}
        onContentChange={vi.fn()}
        onItemTypeChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Type selector should not be visible for USER tiles
    expect(screen.queryByText("Type")).not.toBeInTheDocument();
  });

  it("should call onItemTypeChange when type is changed", async () => {
    const { TileForm } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm"
    );

    const handleItemTypeChange = vi.fn();
    render(
      <TileForm
        mode="create"
        title="Test Title"
        preview=""
        content=""
        itemType="context"
        onPreviewChange={vi.fn()}
        onContentChange={vi.fn()}
        onItemTypeChange={handleItemTypeChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox");
    await userEvent.click(select);
    await userEvent.click(screen.getByText("System"));

    expect(handleItemTypeChange).toHaveBeenCalledWith("system");
  });
});

describe("useTileState hook - itemType state", () => {
  it("should initialize editItemType from tile prop", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const mockTile = {
      id: "1",
      title: "Test Tile",
      preview: "Preview",
      content: "Content",
      itemType: "organizational",
    };

    const { result } = renderHook(() =>
      useTileState({
        tile: mockTile,
        isEditing: false,
        onSave: vi.fn(),
      })
    );

    expect(result.current.editItemType).toBe("organizational");
  });

  it("should default editItemType to 'context' when tile has no itemType", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const mockTile = {
      id: "1",
      title: "Test Tile",
      preview: "Preview",
      content: "Content",
      itemType: null,
    };

    const { result } = renderHook(() =>
      useTileState({
        tile: mockTile,
        isEditing: false,
        onSave: vi.fn(),
      })
    );

    expect(result.current.editItemType).toBe("context");
  });

  it("should update editItemType when setEditItemType is called", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const mockTile = {
      id: "1",
      title: "Test Tile",
      preview: "Preview",
      content: "Content",
      itemType: "context",
    };

    const { result } = renderHook(() =>
      useTileState({
        tile: mockTile,
        isEditing: false,
        onSave: vi.fn(),
      })
    );

    act(() => {
      result.current.setEditItemType("system");
    });

    expect(result.current.editItemType).toBe("system");
  });

  it("should include itemType in save callback", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const mockOnSave = vi.fn();
    const mockTile = {
      id: "1",
      title: "Test Tile",
      preview: "Preview",
      content: "Content",
      itemType: "context",
    };

    const { result } = renderHook(() =>
      useTileState({
        tile: mockTile,
        isEditing: true,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.setEditItemType("system");
    });

    act(() => {
      result.current.handleSave();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        itemType: "system",
      })
    );
  });
});
