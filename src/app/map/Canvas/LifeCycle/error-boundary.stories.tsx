import type { Meta, StoryObj } from "@storybook/react";
import { MapErrorBoundary } from "./error-boundary";
import { fn } from "@storybook/test";
import "~/styles/globals.css";

const meta: Meta<typeof MapErrorBoundary> = {
  title: "Map/Canvas/MapErrorBoundary",
  component: MapErrorBoundary,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Error boundary component that displays when map loading or rendering fails. Features a retry button and accessible error messaging with proper ARIA roles.`,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    error: {
      control: "object",
      description: "The error object that caused the boundary to trigger",
    },
    onRetry: {
      action: "retry",
      description: "Callback function called when the retry button is clicked",
    },
    className: {
      control: "text",
      description:
        "Additional CSS classes to apply to the error boundary container",
    },
  },
  args: {
    onRetry: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MapErrorBoundary>;

// Default error boundary
export const Default: Story = {
  args: {
    error: new Error("Failed to load map data"),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Default error boundary with a generic error message and retry functionality.",
      },
    },
  },
};

// Network error
export const NetworkError: Story = {
  args: {
    error: new Error("Network request failed: Unable to connect to the server"),
  },
  parameters: {
    docs: {
      description: {
        story: "Error boundary displaying a network-related error message.",
      },
    },
  },
};

// Authentication error
export const AuthenticationError: Story = {
  args: {
    error: new Error("Authentication failed: Please log in to access this map"),
  },
  parameters: {
    docs: {
      description: {
        story: "Error boundary showing an authentication-related error.",
      },
    },
  },
};

// Permission error
export const PermissionError: Story = {
  args: {
    error: new Error(
      "Access denied: You don't have permission to view this map",
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Error boundary displaying a permission-related error message.",
      },
    },
  },
};

// Validation error
export const ValidationError: Story = {
  args: {
    error: new Error("Invalid map data: The map structure is corrupted"),
  },
  parameters: {
    docs: {
      description: {
        story: "Error boundary showing a data validation error.",
      },
    },
  },
};

// Error with no message
export const ErrorWithoutMessage: Story = {
  args: {
    error: new Error(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error boundary handling an error object with no message, showing fallback text.",
      },
    },
  },
};

// Error with very long message
export const LongErrorMessage: Story = {
  args: {
    error: new Error(
      "This is a very long error message that might wrap to multiple lines and test how the error boundary handles extensive error descriptions that provide detailed information about what went wrong during the map loading process including specific technical details that might be useful for debugging purposes",
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error boundary with a very long error message to test text wrapping and layout.",
      },
    },
  },
};

// Custom className
export const CustomStyling: Story = {
  args: {
    error: new Error("Map loading failed with custom styling"),
    className: "bg-destructive/10 border border-destructive/20",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error boundary with custom CSS classes applied for different visual styling.",
      },
    },
  },
};

// In smaller container
export const InContainer: Story = {
  args: {
    error: new Error("Failed to load map in constrained space"),
  },
  decorators: [
    (Story) => (
      <div className="h-96 w-96 border-2 border-dashed border-neutral-300">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        story:
          "Error boundary displayed within a smaller constrained container to show responsive behavior.",
      },
    },
  },
};

// Dark theme variant
export const DarkTheme: Story = {
  args: {
    error: new Error("Dark theme error display"),
    className: "bg-neutral-900 text-white",
  },
  decorators: [
    (Story) => (
      <div className="bg-neutral-900 p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Error boundary styled for dark theme environments.",
      },
    },
  },
};

// JavaScript disabled fallback
export const NoScriptFallback: Story = {
  args: {
    error: new Error("JavaScript is disabled"),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error boundary showing the noscript fallback message for environments without JavaScript.",
      },
    },
  },
};
