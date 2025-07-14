import type { Meta, StoryObj } from "@storybook/react";
import { StaticAuthTile } from "./auth";
import React from "react";
import "~/styles/globals.css"; // Ensure global styles are applied

const meta: Meta<typeof StaticAuthTile> = {
  title: "Map/Tile/StaticAuthTile",
  component: StaticAuthTile,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    initialView: {
      control: "radio",
      options: ["login", "register"],
    },
  },
  args: {
    // Default args for all stories
    initialView: "login",
  },
};

export default meta;
type Story = StoryObj<typeof StaticAuthTile>;

export const LoginView: Story = {
  args: {
    initialView: "login",
  },
};

export const RegisterView: Story = {
  args: {
    initialView: "register",
  },
};