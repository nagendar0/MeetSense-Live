"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar isOpen={sidebarOpen} />
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? "ml-60" : "ml-20"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
