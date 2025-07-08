import React from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#203a43] text-white">
      <div className="flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center">
          <img
            src="/astronaut.svg"
            alt="Astrolite Astronaut"
            className="w-32 h-32 mb-4 drop-shadow-lg animate-float"
            style={{ filter: "drop-shadow(0 0 24px #7fdbff)" }}
          />
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Astrolite Share
          </h1>
          <p className="text-lg text-blue-100 max-w-md text-center">
            Effortless, cosmic file sharing.<br />
            Send files at lightspeed, astronaut style.
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow-lg transition"
            disabled
          >
            Send
          </button>
          <button
            className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold shadow-lg transition"
            disabled
          >
            Receive
          </button>
        </div>
      </div>
      <style>{`
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </main>
  );
}