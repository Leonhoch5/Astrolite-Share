"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function OrbitingDots() {
  const satellites = Array.from({ length: 8 });
  return (
    <div className="relative w-[18rem] h-[18rem] sm:w-[22rem] sm:h-[22rem] flex items-center justify-center z-10">
      {/* Central planet */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-900 shadow-2xl border-4 border-blue-200/30 flex items-center justify-center ring-4 ring-cyan-300/20">
        {/* Glowing ring */}
        <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-2 border-cyan-300/10 blur-[2px] animate-pulse" />
        {/* Subtle planet texture */}
        <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-blue-300/30 to-blue-900/10 blur-[2px]" />
      </div>
      {/* Orbiting satellites */}
      {satellites.map((_, i) => {
        const angle = (i / satellites.length) * 2 * Math.PI;
        const orbitRadius = 120;
        const animationDelay = `${i * 0.3}s`;
        return (
          <div
            key={i}
            className="absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 shadow-lg orbit-dot border-2 border-white/40"
            style={{
              left: `calc(50% + ${Math.cos(angle) * orbitRadius}px - 0.75rem)`,
              top: `calc(50% + ${Math.sin(angle) * orbitRadius}px - 0.75rem)`,
              animationDelay,
            }}
          />
        );
      })}
      {/* Occasional "ping" lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 352 352" fill="none">
        <circle
          cx="176" cy="176" r="120"
          stroke="url(#ping-gradient)" strokeWidth="2" strokeDasharray="12 12"
          className="animate-spin-slow"
        />
        <defs>
          <linearGradient id="ping-gradient" x1="0" y1="0" x2="352" y2="352" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67e8f9" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <style>{`
        .orbit-dot {
          animation: orbit-pulse 2.4s cubic-bezier(.4,0,.2,1) infinite;
        }
        @keyframes orbit-pulse {
          0% { transform: scale(1); opacity: 0.85; }
          60% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.85; }
        }
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [connectTo, setConnectTo] = useState("");
  // Change incoming to hold both sender and message
  const [incoming, setIncoming] = useState<{ from: string, content?: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");

  // Check login status from localStorage on mount
  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn !== "true") {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    // Fetch peerId from /me endpoint
    fetch("http://localhost:3001/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user.peerId) {
          setPeerId(data.user.peerId);

          // Connect to signaling server
          const ws = new WebSocket("ws://localhost:3001");
          wsRef.current = ws;

          ws.onopen = () => {
            setWsStatus("Connected");
            // Register this peerId with the server
            ws.send(JSON.stringify({ type: "register", peerId: data.user.peerId }));
          };
          ws.onclose = () => setWsStatus("Disconnected");
          ws.onerror = () => setWsStatus("Error");

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === "init" && msg.peerId) {
                setPeerId(msg.peerId);
              }
              // Handle incoming requests/messages
              if (msg.type === "request" && msg.from) {
                setIncoming(prev => [...prev, { from: msg.from, content: msg.content }]);
              }
              if (msg.type === "message" && msg.from) {
                setIncoming(prev => [...prev, { from: msg.from, content: msg.content }]);
              }
            } catch { }
          };
        } else {
          router.replace("/login");
        }
      });
  }, [router]);

  // Handle file input
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  // Send a connect request to another peer with a message and optional file
  function handleConnect() {
    if (wsRef.current && connectTo) {
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const fileData = reader.result as string;
          wsRef.current!.send(JSON.stringify({
            type: "request",
            toUsername: connectTo,
            content: message,
            file: {
              name: file.name,
              type: file.type,
              data: fileData, // base64 string
            }
          }));
        };
        reader.readAsDataURL(file); // base64 encode
      } else {
        wsRef.current.send(JSON.stringify({ type: "request", toUsername: connectTo, content: message }));
      }
    }
  }

  // Handle incoming file and trigger download
  useEffect(() => {
    if (!wsRef.current) return;
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "init" && msg.peerId) {
          setPeerId(msg.peerId);
        }
        if ((msg.type === "request" || msg.type === "message") && msg.from) {
          setIncoming(prev => [...prev, { from: msg.from, content: msg.content }]);
          if (msg.file && msg.file.data && msg.file.name) {
            // Create a link and trigger download
            const link = document.createElement("a");
            link.href = msg.file.data;
            link.download = msg.file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } catch { }
    };
  }, [wsRef.current]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#203a43] text-white relative overflow-hidden">
      {/* Decorative stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-30"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              filter: "blur(0.5px)",
              animation: `twinkle ${2 + Math.random() * 3}s infinite alternate`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      {/* Orbiting Dots and Title */}
      <div className="flex flex-col items-center z-10 w-full px-4">
        <OrbitingDots />
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-2 text-center mt-6 drop-shadow-lg">
          Astrolite Share
        </h1>
        <p className="text-lg sm:text-xl text-blue-200 mb-4">
          Welcome to sharing made easy!
        </p>
      </div>
      {/* Peer Connection UI */}
      <div className="flex flex-col items-center space-y-6 z-10 w-full max-w-md px-2">
        <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center space-y-4 shadow-2xl border border-white/10 transition-all">
          <div className="w-full text-center text-blue-200 text-sm mb-2 flex items-center justify-center gap-2">
            <span className="inline-block align-middle text-lg">🛰️</span>
            <span>
              {incoming.length > 0
                ? incoming.map((item, idx) =>
                  <div key={idx}>
                    Incoming request from: <b>{item.from}</b>
                    {item.content && <> — <span className="italic text-blue-100">"{item.content}"</span></>}
                  </div>
                )
                : "Waiting for peer connection..."}
            </span>
          </div>
          <div className="flex flex-col w-full gap-4">
            <input
              className="w-full px-3 py-2 rounded bg-white/20 text-white placeholder-blue-200 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter Username of receiver to connect"
              value={connectTo}
              onChange={e => setConnectTo(e.target.value)}
              autoComplete="off"
            />
            <input
              className="w-full px-3 py-2 rounded bg-white/20 text-white placeholder-blue-200 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter your Message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              autoComplete="off"
            />
            <input
              type="file"
              className="w-full px-3 py-2 rounded bg-white/20 text-white placeholder-blue-200 outline-none focus:ring-2 focus:ring-blue-400 file:bg-blue-500 file:text-white file:rounded file:px-3 file:py-2"
              onChange={handleFileChange}
            />
            <button
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-semibold shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={handleConnect}
              disabled={!connectTo || !peerId}
            >
              Connect to Peer
            </button>
          </div>
        </div>
      </div>
      {/* Responsive/fancy styles */}
      <style>{`
        @media (max-width: 640px) {
          .w-48, .h-48, .w-[18rem], .h-[18rem] { width: 12rem !important; height: 12rem !important; }
          .w-20, .h-20, .w-24, .h-24, .w-32, .h-32 { width: 5rem !important; height: 5rem !important; }
        }
        @keyframes twinkle {
          from { opacity: 0.2; }
          to { opacity: 0.7; }
        }
      `}</style>
    </main>
  );
}