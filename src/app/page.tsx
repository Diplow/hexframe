import { redirect } from "next/navigation";

/**
 * Root page that redirects to the map with default center
 * Users can start exploring immediately without extra navigation
 */
export default function RootPage() {
  redirect("/map?center=1");
}