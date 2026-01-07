import "~/test/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the tRPC API for all TypeSelectorField tests
vi.mock("~/commons/trpc/react", () => ({
  api: {
    agentic: {
      getEffectiveAllowlist: {
        useQuery: vi.fn(() => ({
          data: { allowedTypes: ['organizational', 'context', 'system'] },
          isLoading: false,
        })),
      },
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

describe("TypeSelectorField Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      await userEvent.selectOptions(select, "system");

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
      await userEvent.selectOptions(select, "context");

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

    it("should not allow selection when disabled", async () => {
      const { _TypeSelectorField } = await import(
        "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_TypeSelectorField"
      );

      const handleChange = vi.fn();
      render(
        <_TypeSelectorField
          value="context"
          onChange={handleChange}
          disabled={true}
        />
      );

      const select = screen.getByRole("combobox");

      // Native selects are always in the DOM, but disabled selects
      // won't trigger onChange when interacted with
      expect(select).toBeDisabled();
    });
  });
});

describe("TileForm with TypeSelector", () => {
  // Uses the mock already defined at the top of the file

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
        itemType="context"
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
    await userEvent.selectOptions(select, "system");

    expect(handleItemTypeChange).toHaveBeenCalledWith("system");
  });
});

describe("useTileState hook - itemType state", () => {
  it("should initialize itemType from prop", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const { result } = renderHook(() =>
      useTileState({
        title: "Test Tile",
        preview: "Preview",
        content: "Content",
        itemType: "organizational",
        tileId: "1",
      })
    );

    expect(result.current.editing.itemType).toBe("organizational");
  });

  it("should default itemType to 'context' when prop is null", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const { result } = renderHook(() =>
      useTileState({
        title: "Test Tile",
        preview: "Preview",
        content: "Content",
        itemType: null,
        tileId: "1",
      })
    );

    expect(result.current.editing.itemType).toBe("context");
  });

  it("should update itemType when setItemType is called", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const { result } = renderHook(() =>
      useTileState({
        title: "Test Tile",
        preview: "Preview",
        content: "Content",
        itemType: "context",
        tileId: "1",
      })
    );

    act(() => {
      result.current.editing.setItemType("system");
    });

    expect(result.current.editing.itemType).toBe("system");
  });

  it("should preserve itemType when prop is user type", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useTileState } = await import(
      "~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState"
    );

    const { result } = renderHook(() =>
      useTileState({
        title: "Root Tile",
        preview: "",
        content: "",
        itemType: "user",
        tileId: "root",
      })
    );

    // USER type is preserved in state (UI hides the selector via isUserTile prop)
    expect(result.current.editing.itemType).toBe("user");
  });
});
