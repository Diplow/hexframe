import type { Meta, StoryObj } from "@storybook/react";
import NotFound from "./not-found";
import "~/styles/globals.css";

const meta: Meta<typeof NotFound> = {
  title: "Map/Pages/NotFound",
  component: NotFound,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Not found page component displayed when a requested map ID does not exist. Provides a centered message with full screen coverage.`,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NotFound>;

// Default not found page
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default not found page with centered message taking full screen height.",
      },
    },
  },
};

// In smaller container
export const InContainer: Story = {
  decorators: [
    (Story) => (
      <div className="h-96 w-full border-2 border-dashed border-neutral-300">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        story:
          "Not found page displayed within a constrained container to show how it adapts to different heights.",
      },
    },
  },
};

// Mobile viewport
export const Mobile: Story = {
  decorators: [
    (Story) => (
      <div className="h-screen w-80 border-2 border-dashed border-neutral-300">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        story:
          "Not found page in a mobile-sized viewport to test responsive behavior.",
      },
    },
  },
};

// Tablet viewport
export const Tablet: Story = {
  decorators: [
    (Story) => (
      <div className="h-screen w-96 border-2 border-dashed border-neutral-300 md:w-[768px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        story: "Not found page in a tablet-sized viewport.",
      },
    },
  },
};

// With dark background
export const DarkBackground: Story = {
  decorators: [
    (Story) => (
      <div className="bg-neutral-900">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Not found page displayed against a dark background to test contrast.",
      },
    },
  },
};

// With custom background pattern
export const WithPattern: Story = {
  decorators: [
    (Story) => (
      <div
        className="bg-gradient-to-br from-blue-50 to-indigo-100"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.15) 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Not found page with a custom gradient and dot pattern background.",
      },
    },
  },
};

// Very short container
export const ShortContainer: Story = {
  decorators: [
    (Story) => (
      <div className="h-32 w-full border-2 border-dashed border-destructive">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        story:
          "Not found page in a very short container to test extreme height constraints.",
      },
    },
  },
};

// Very wide container
export const WideContainer: Story = {
  decorators: [
    (Story) => (
      <div className="h-screen w-screen max-w-[1920px] border-2 border-dashed border-success">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story:
          "Not found page in a very wide container to test ultra-wide displays.",
      },
    },
  },
};
