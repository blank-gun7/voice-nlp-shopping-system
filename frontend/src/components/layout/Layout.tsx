import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import Toast from "../shared/Toast";
import VoiceOverlay from "../voice/VoiceOverlay";
import ProductSheet from "../store/ProductSheet";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-100">
      <TopBar />

      {/* Page content scrolls above the fixed bottom nav */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "var(--bottom-nav-height)" }}
      >
        <Outlet />
      </main>

      <BottomNav />

      {/* Global overlays */}
      <Toast />
      <VoiceOverlay />
      <ProductSheet />
    </div>
  );
}
