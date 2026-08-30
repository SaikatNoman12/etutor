import { redirect } from "react-router";

/**
 * The console's front door.
 *
 * `/` had no route at all: the root layout rendered with an empty <Outlet />,
 * so opening etutor-admin.vercel.app produced a blank white page with no way to
 * reach the login form. The login page then sent people back to `/` on success,
 * which meant a correct password also ended in that blank page.
 *
 * Redirecting in the loader keeps it a server-side 302 on first load — no
 * flash of an empty document before the client decides where to go.
 */
export function loader() {
  return redirect("/admin");
}

export default function AdminIndexRedirect() {
  return null;
}
