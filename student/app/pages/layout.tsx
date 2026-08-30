import { Outlet } from "react-router";
import Header from "~/components/layout/header";
import Footer from "~/components/layout/footer";
import { Toaster } from "~/components/ui/sonner";

export default function BaseLayout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto flex-1 flex">
        <Outlet />
      </main>
      <Footer />
      {/* Sonner's host element. Every toast in this app -- 35 calls across 8 files here
          -- is a no-op without it: `toast.success(...)` returns quietly and nothing is
          drawn. Added to a cart, saved a profile, mistyped a coupon: all of it happened
          silently, which reads to anyone using the app as a button that does nothing. */}
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}