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

function RequestModal({
  open,
  from,
  content,
  file,
  onAccept,
  onDecline,
}: {
  open: boolean;
  from: string;
  content?: string;
  file?: { name: string; type: string };
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadein">
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-700 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-cyan-300/30 scale-95 animate-popin">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-cyan-200 mb-2 animate-pulse">Incoming Request</div>
          <div className="text-blue-100 mb-1">From: <b>{from}</b></div>
          {content && <div className="italic text-blue-200 mb-1">"{content}"</div>}
          {file && (
            <div className="text-blue-300 mb-2">
              <span className="font-semibold">File:</span> {file.name} <span className="text-xs text-blue-100">({file.type})</span>
            </div>
          )}
        </div>
        <div className="flex gap-4 justify-center mt-4">
          <button
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold shadow hover:scale-105 transition-all"
            onClick={onAccept}
          >
            Accept
          </button>
          <button
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-400 to-pink-500 text-white font-semibold shadow hover:scale-105 transition-all"
            onClick={onDecline}
          >
            Decline
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadein { animation: fadein 0.2s; }
        @keyframes popin { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-popin { animation: popin 0.25s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}

// Utility: split file into chunks
function chunkFile(file: File, chunkSize = 64 * 1024) {
  const chunks = [];
  let offset = 0;
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
}

export default function Home() {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [connectTo, setConnectTo] = useState("");
  // Change incoming to hold both sender and message
  const [incoming, setIncoming] = useState<{ from: string, content?: string }[]>([]);
  const [pendingQueue, setPendingQueue] = useState<
    { from: string; content?: string; file?: { name: string; type: string; data: string } }[]
  >([]);
  const [pendingRequest, setPendingRequest] = useState<{
    from: string;
    content?: string;
    file?: { name: string; type: string; data: string };
  } | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{
    fileName: string;
    received: number;
    total: number;
    from: string;
    done: boolean;
  } | null>(null);

  const [sendFeedback, setSendFeedback] = useState<string>("");

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
    fetch("http://localhost:3001/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user.peerId) {
          setPeerId(data.user.peerId);

          const ws = new WebSocket("ws://localhost:3001");
          wsRef.current = ws;

          ws.onopen = () => {
            setWsStatus("Connected");
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
              // Show modal for incoming request
              if (msg.type === "request" && msg.from) {
                // If a request is already being handled, queue the new one
                if (pendingRequest) {
                  setPendingQueue(queue => [...queue, {
                    from: msg.from,
                    content: msg.content,
                    file: msg.file,
                  }]);
                } else {
                  setPendingRequest({
                    from: msg.from,
                    content: msg.content,
                    file: msg.file,
                  });
                }
              }
              // Show incoming chat messages in the list
              if (msg.type === "message" && msg.from) {
                setIncoming(prev => [...prev, { from: msg.from, content: msg.content }]);
              }
              if (msg.type === "file-chunk" && msg.from) {
                const key = `${msg.from}-${msg.fileName}`;
                if (!fileChunksRef.current[key]) fileChunksRef.current[key] = [];
                fileChunksRef.current[key][msg.chunkIndex] = new Uint8Array(msg.data);
              }
              if (msg.type === "file-end" && msg.from) {
                const key = `${msg.from}-${msg.fileName}`;
                const chunks = fileChunksRef.current[key];
                if (chunks && chunks.length === msg.totalChunks) {
                  // Combine chunks
                  const blob = new Blob(chunks, { type: msg.fileType });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = msg.fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  delete fileChunksRef.current[key];
                }
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
  async function sendFileChunks(toUsername: string, file: File) {
    const ws = wsRef.current;
    if (!ws) return;

    const chunks = chunkFile(file);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = await chunks[i].arrayBuffer();
      ws.send(JSON.stringify({
        type: "file-chunk",
        toUsername,
        fileName: file.name,
        fileType: file.type,
        chunkIndex: i,
        totalChunks: chunks.length,
        data: Array.from(new Uint8Array(chunk)), // send as array of numbers
      }));
    }
    // Signal end of file
    ws.send(JSON.stringify({
      type: "file-end",
      toUsername,
      fileName: file.name,
      fileType: file.type,
      totalChunks: chunks.length,
    }));
  }
  function handleConnect() {
    if (wsRef.current && connectTo) {
      if (file) {
        sendFileChunks(connectTo, file);
        wsRef.current.send(JSON.stringify({
          type: "request",
          toUsername: connectTo,
          content: message,
          fileMeta: {
            name: file.name,
            type: file.type,
            size: file.size,
          }
        }));
      } else {
        wsRef.current.send(JSON.stringify({ type: "request", toUsername: connectTo, content: message }));
      }
    }
  }

  const fileChunksRef = useRef<{ [key: string]: Uint8Array[] }>({});

  useEffect(() => {
    if (!wsRef.current) return;
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "init" && msg.peerId) {
          setPeerId(msg.peerId);
        }
        if (msg.type === "request" && msg.from) {
          // If a request is already being handled, queue the new one
          if (pendingRequest) {
            setPendingQueue(queue => [...queue, {
              from: msg.from,
              content: msg.content,
              file: msg.file,
            }]);
          } else {
            setPendingRequest({
              from: msg.from,
              content: msg.content,
              file: msg.file,
            });
          }
        }
        if (msg.type === "file-chunk" && msg.from) {
          const key = `${msg.from}-${msg.fileName}`;
          if (!fileChunksRef.current[key]) fileChunksRef.current[key] = [];
          fileChunksRef.current[key][msg.chunkIndex] = new Uint8Array(msg.data);

          setDownloadStatus({
            fileName: msg.fileName,
            received: fileChunksRef.current[key].filter(Boolean).length,
            total: msg.totalChunks,
            from: msg.from,
            done: false,
          });
        }
        if (msg.type === "file-end" && msg.from) {
          const key = `${msg.from}-${msg.fileName}`;
          const chunks = fileChunksRef.current[key];
          if (chunks && chunks.length === msg.totalChunks) {
            // Combine chunks
            const blob = new Blob(chunks, { type: msg.fileType });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = msg.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            delete fileChunksRef.current[key];
            setDownloadStatus({
              fileName: msg.fileName,
              received: msg.totalChunks,
              total: msg.totalChunks,
              from: msg.from,
              done: true,
            });
            setTimeout(() => setDownloadStatus(null), 4000);
          }
        }

        if (msg.type === "message" && msg.from) {
          setIncoming(prev => [...prev, { from: msg.from, content: msg.content }]);
          // Feedback for sender
          if (msg.content === "Request accepted!" || msg.content === "Request declined.") {
            setSendFeedback(`Peer ${msg.from}: ${msg.content}`);
            setTimeout(() => setSendFeedback(""), 4000);
          }
        }
      } catch { }
    };
  }, [wsRef.current, pendingRequest]);



  // When pendingRequest is cleared, show next in queue if available
  useEffect(() => {
    if (!pendingRequest && pendingQueue.length > 0) {
      setPendingRequest(pendingQueue[0]);
      setPendingQueue(queue => queue.slice(1));
    }
  }, [pendingRequest, pendingQueue]);

  // Accept incoming request
  function handleAcceptRequest() {
    if (pendingRequest && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        toUsername: pendingRequest.from,
        content: "Request accepted!",
      }));
      setIncoming(prev => [...prev, { from: pendingRequest.from, content: pendingRequest.content }]);
      setPendingRequest(null); // This will trigger the next popup if queued
    }
  }

  // Decline incoming request
  function handleDeclineRequest() {
    if (pendingRequest && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        toUsername: pendingRequest.from,
        content: "Request declined.",
      }));
      setPendingRequest(null); // This will trigger the next popup if queued
    }
  }

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
      {/* Download progress info (bottom right corner) */}
      {downloadStatus && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-900/90 text-cyan-100 px-4 py-3 rounded-xl shadow-lg border border-cyan-400/30 animate-popin">
          <div className="font-semibold mb-1">Receiving file from <span className="text-cyan-300">{downloadStatus.from}</span></div>
          <div>
            <span className="font-bold">{downloadStatus.fileName}</span>
            <span className="ml-2 text-xs text-blue-200">
              {downloadStatus.received}/{downloadStatus.total} chunks
            </span>
          </div>
          <div className="w-full bg-cyan-800/40 rounded h-2 mt-2 mb-1">
            <div
              className="bg-cyan-400 h-2 rounded transition-all"
              style={{
                width: `${(downloadStatus.received / downloadStatus.total) * 100}%`
              }}
            />
          </div>
          {downloadStatus.done && <div className="text-green-300 mt-1">Download complete!</div>}
        </div>
      )}

      {/* Sender feedback (top right corner) */}
      {sendFeedback && (
        <div className="fixed top-4 right-4 z-50 bg-cyan-900/90 text-white px-4 py-2 rounded-xl shadow-lg border border-cyan-400/30 animate-popin">
          {sendFeedback}
        </div>
      )}

      {/* Request Modal */}
      <RequestModal
        open={!!pendingRequest}
        from={pendingRequest?.from || ""}
        content={pendingRequest?.content}
        file={pendingRequest?.file}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />

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