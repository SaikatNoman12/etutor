import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";

/**
 * The root shell.
 *
 * It used to render the student site's Header and Footer around every console
 * screen, so the console carried TWO top bars — this one, with a "Sign in" link,
 * stacked above AdminLayout's own — and the login page carried console chrome it
 * has no use for. The console's chrome belongs to AdminLayout, which only the
 * signed-in screens mount; this shell holds what is genuinely app-wide.
 */
export default function BaseLayout() {
  return (
    <div className="relative min-h-screen">
      <Outlet />
      {/* Sonner's host element. Every toast in this app is a no-op without it:
          `toast.success(...)` returns quietly and nothing is drawn — which reads,
          to anyone using the console, as a button that did nothing. */}
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
