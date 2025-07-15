"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        const res = await fetch("https://astrolite-share-api.onrender.com/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
            localStorage.setItem("loggedIn", "true");
            router.replace("/");
        } else {
            const data = await res.json();
            setError(data.error || "Login failed");
        }
    }


    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#203a43] text-white">
            <form onSubmit={handleLogin} className="bg-white/10 p-8 rounded-2xl shadow-xl flex flex-col gap-4 w-full max-w-xs">
                <h2 className="text-2xl font-bold mb-2 text-center">Login</h2>
                <input
                    className="px-3 py-2 rounded bg-white/20 text-white placeholder-blue-200 outline-none"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                />
                <input
                    className="px-3 py-2 rounded bg-white/20 text-white placeholder-blue-200 outline-none"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
                {error && <div className="text-red-300 text-sm">{error}</div>}
                <button
                    className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold shadow-lg"
                    type="submit"
                >
                    Login
                </button>
                <button
                    type="button"
                    className="text-blue-200 underline mt-2"
                    onClick={() => router.push("/register")}
                >
                    Need an account? Register
                </button>
            </form>
        </main>
    );
}