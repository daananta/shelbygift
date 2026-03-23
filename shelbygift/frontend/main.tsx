import "../vite.polyfills";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "@/App.tsx";
import { Toaster } from "@/components/ui/toaster.tsx";
import { WalletProvider } from "@/components/WalletProvider.tsx";
import { ShelbyWrapper } from "@/components/ShelbyWrapper";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <QueryClientProvider client={queryClient}>
          <ShelbyWrapper>
            <App />
            <Toaster />
          </ShelbyWrapper>
        </QueryClientProvider>
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
