import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { Home } from "@/pages/Home";
import { Create } from "@/pages/Create";
import { Envelope } from "@/pages/Envelope";

function App() {
  return (
    <div className="min-h-screen bg-gradient-pink relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="blob-pink blob-1 animate-float" />
      <div className="blob-pink blob-2" />

      <div className="relative z-10">
        <Header />
        <main className="max-w-screen-xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/envelope/:address" element={<Envelope />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
