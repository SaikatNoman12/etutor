import { Outlet } from "react-router";
import Header from "~/components/layout/header";
import Footer from "~/components/layout/footer";
import { Toaster } from "~/components/ui/sonner";

export default function BaseLayout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      {/* A plain block, deliberately. As a flex container it made every page a
          flex ITEM, and each page's own `mx-auto` then set auto margins on the
          cross axis — which overrides `stretch` and shrinks the item to its
          content. Identical wrappers (`mx-auto max-w-[1240px] px-[24px]`)
          therefore rendered at 1192px on the catalogue, 935px on instructors,
          747px on checkout and 274px on an empty cart, and the sign-in card
          became a narrow grey stripe pinned left of centre. `flex-1` still keeps
          the footer at the bottom — that is main's role as a CHILD of the column
          above; it does not have to be a column itself. */}
      <main className="container mx-auto w-full flex-1">
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