import { Outlet } from "react-router";
import Header from "~/components/layout/header";
import Footer from "~/components/layout/footer";
import { Toaster } from "~/components/ui/sonner";

export default function BaseLayout() {
  return (
    // No `min-h-screen`. It stretched <main> (flex-1) so the footer always sat
    // at the bottom of the viewport — which on a short page (an empty cart, a
    // two-row order list) is a long blank stretch of canvas between the content
    // and the footer. The footer now follows the content; the html ground is
    // the footer's ink, so on a short page the dark footer simply runs to the
    // bottom of the window instead of a light strip appearing under it.
    <div className="relative flex flex-col bg-[var(--c-canvas)]">
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
      {/* The page's distance from the header and the footer is the LAYOUT's
          decision, not each page's. Twelve pages each carried their own
          `py-[32px]`, and the two that did not — the home page's full-bleed hero
          and the console's orders screen — sat flush against the bar above them
          while every other page had 32px. A rhythm that every screen has to
          remember is a rhythm that some screen will forget. */}
      <main className="container mx-auto w-full py-[24px] sm:py-[32px]">
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