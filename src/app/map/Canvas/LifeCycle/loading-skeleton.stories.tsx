import type { Meta, StoryObj } from "@storybook/react";
import {
  DEFAULT_BLINKING_FREQUENCY,
  MapLoadingSkeleton,
} from "./loading-skeleton";
import "~/styles/globals.css";

const meta: Meta<typeof MapLoadingSkeleton> = {
  title: "Map/Canvas/MapLoadingSkeleton",
  component: MapLoadingSkeleton,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Loading skeleton that displays an animated hexagonal map structure while data is being fetched. Features alternating colors between even/odd children tiles that swap every blinkingFrequency milliseconds (default: ${DEFAULT_BLINKING_FREQUENCY}ms).`,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes to apply to the skeleton container",
    },
    message: {
      control: "text",
      description: "Loading message for screen readers and accessibility",
    },
    blinkingFrequency: {
      control: { type: "range", min: 100, max: 2000, step: 50 },
      description: `Animation frequency in milliseconds for color alternating pattern (default: ${DEFAULT_BLINKING_FREQUENCY}ms)`,
    },
  },
};

export default meta;
type Story = StoryObj<typeof MapLoadingSkeleton>;

// Default loading skeleton
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `Default loading skeleton with animated hexagonal tiles alternating between zinc-200 and zinc-300 colors every ${DEFAULT_BLINKING_FREQUENCY}ms.`,
      },
    },
  },
};

// Custom loading message
export const CustomMessage: Story = {
  args: {
    message: "Fetching your map data...",
  },
  parameters: {
    docs: {
      description: {
        story: "Loading skeleton with a custom accessibility message.",
      },
    },
  },
};

// Centered in smaller container
export const InContainer: Story = {
  args: {
    message: "Loading in constrained space...",
    blinkingFrequency: DEFAULT_BLINKING_FREQUENCY,
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
          "Loading skeleton displayed within a smaller constrained container with faster blinking (300ms) to show responsive behavior.",
      },
    },
  },
};

// Loading skeleton with dark background
export const DarkBackground: Story = {
  args: {
    className: "bg-neutral-700",
    message: "Loading on dark background...",
    blinkingFrequency: DEFAULT_BLINKING_FREQUENCY,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Loading skeleton displayed on a dark background with medium blinking frequency (500ms) to show contrast.",
      },
    },
  },
};
