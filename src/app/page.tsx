"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Workflow, Zap, Layers, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Navbar */}
      <nav className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--purple-glow)" }}
            >
              <Workflow className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            </div>
            <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Workflow Builder
            </span>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    color: "var(--text-secondary)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#000000",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/app">
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#000000",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Start Now
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <h1
          className="text-6xl font-bold mb-6 leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Build AI Workflows
          <br />
          <span style={{ color: "var(--accent)" }}>Visually</span>
        </h1>
        <p
          className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Create powerful multi-modal AI workflows with a simple drag-and-drop interface.
          Connect text, images, and LLMs to build complex automations in minutes.
        </p>
        <Link href="/app">
          <button
            className="px-8 py-4 rounded-lg text-lg font-semibold transition-all inline-flex items-center gap-2"
            style={{
              backgroundColor: "var(--accent)",
              color: "#000000",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(244, 255, 111, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Start Now
            <Sparkles className="w-5 h-5" />
          </button>
        </Link>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div
            className="p-6 rounded-xl transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover)";
              e.currentTarget.style.borderColor = "var(--purple-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--purple-glow)" }}
            >
              <Workflow className="w-6 h-6" style={{ color: "var(--text-primary)" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Visual Workflows
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Build complex workflows with an intuitive node-based interface. No code required.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            className="p-6 rounded-xl transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover)";
              e.currentTarget.style.borderColor = "var(--purple-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--success)" }}
            >
              <Layers className="w-6 h-6" style={{ color: "var(--text-primary)" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Multi-Modal AI
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Combine text, images, and video in your workflows. Process any media type seamlessly.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            className="p-6 rounded-xl transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover)";
              e.currentTarget.style.borderColor = "var(--purple-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--warning)" }}
            >
              <Zap className="w-6 h-6" style={{ color: "#000000" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Node-Based Execution
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Each node executes independently. Debug easily and iterate faster on your workflows.
            </p>
          </div>

          {/* Feature 4 */}
          <div
            className="p-6 rounded-xl transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover)";
              e.currentTarget.style.borderColor = "var(--purple-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Sparkles className="w-6 h-6" style={{ color: "#000000" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Fast Iteration
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Test and refine your workflows in real-time. See results instantly as you build.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
