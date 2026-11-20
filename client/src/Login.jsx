import { useState } from "react";
import { api } from "./api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token, user } =
        mode === "login" ? await api.login(form) : await api.register(form);
      onLogin(token, user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">
          <span className="logo">F</span>FreelanceFlow
        </div>
        <p className="muted tagline">
          {mode === "login"
            ? "Welcome back. Log in to your workspace."
            : "Create an account to start tracking projects."}
        </p>

        {mode === "register" && (
          <input
            placeholder="Your name"
            value={form.name}
            onChange={set("name")}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={set("email")}
          required
        />
        <input
          type="password"
          placeholder="Password (6+ characters)"
          value={form.password}
          onChange={set("password")}
          required
        />

        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>

        <button
          type="button"
          className="btn btn-link"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
