"use client";

import React, { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  ListingItem,
  RequestItem,
  registerUmStudent,
  signInUmStudent,
  signOutUmStudent,
  triggerVerificationEmail,
  subscribeToAuthChanges,
  createListing,
  subscribeToListings,
  createPendingRequest,
  subscribeToRequests,
  acceptIncomingRequest,
  rejectIncomingRequest,
  cancelRequestAndRestoreAvailability,
  completeItemHandover,
} from "../backend/umloopBackend";

interface FaqLog {
  question: string;
  answer: string;
  tokensUsed: number;
  latencyMs: number;
  outcome: "SUCCESS" | "FAILURE_OUT_OF_SCOPE" | "FAILURE_USAGE_LIMIT" | "FAILURE_ERROR";
  mode: string;
}

const SESSION_QUERY_LIMIT = 5;

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function UMLoopHomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [emailInput, setEmailInput] = useState("seller1@siswa.um.edu.my");
  const [passwordInput, setPasswordInput] = useState("123456");

  const [titleInput, setTitleInput] = useState("Scientific Calculator Casio FX-570EX");
  const [categoryInput, setCategoryInput] = useState("Exchange");
  const [isTestInput, setIsTestInput] = useState("false");

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [reuseCount, setReuseCount] = useState(0);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  // KAN-60 Bounded Chatbot State
  const [selectedFaq, setSelectedFaq] = useState("q1");
  const [customQuestion, setCustomQuestion] = useState("");
  const [faqLogs, setFaqLogs] = useState<FaqLog[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);

  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
    const unsubListings = subscribeToListings((items, count) => {
      setListings(items);
      setReuseCount(count);
    });
    const unsubRequests = subscribeToRequests((reqs) => {
      setRequests(reqs);
    });

    return () => {
      unsubAuth();
      unsubListings();
      unsubRequests();
    };
  }, []);

  const showBanner = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
  };

  // Quick helper to authenticate either of the two test users (KAN-60 Priority 1)
  const handleQuickTestUserAuth = async (testEmail: string, roleLabel: string) => {
    setEmailInput(testEmail);
    setPasswordInput("123456");
    try {
      showBanner(`Authenticating ${roleLabel} (${testEmail})...`, false);
      if (currentUser) {
        await signOutUmStudent();
      }
      try {
        await signInUmStudent(testEmail, "123456");
      } catch {
        await registerUmStudent(testEmail, "123456");
      }
      showBanner(`Authenticated as ${roleLabel}: ${testEmail}`, false);
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Authentication failed"), true);
    }
  };

  const handleRegister = async () => {
    try {
      showBanner("Registering account...", false);
      await registerUmStudent(emailInput, passwordInput);
      showBanner(`Account registered and signed in as: ${emailInput}`, false);
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Registration failed"), true);
    }
  };

  const handleSignIn = async () => {
    try {
      showBanner("Signing in...", false);
      await signInUmStudent(emailInput, passwordInput);
      showBanner(`Signed in successfully as: ${emailInput}`, false);
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Sign-in failed"), true);
    }
  };

  const handleSignOut = async () => {
    await signOutUmStudent();
    showBanner("Signed out successfully.", false);
  };

  const handleVerifyEmail = async () => {
    if (!currentUser) return;
    try {
      await triggerVerificationEmail(currentUser);
      showBanner(`Verification email sent to ${currentUser.email}`, false);
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Failed to send verification email"), true);
    }
  };

  const handleCreateListing = async () => {
    try {
      await createListing(
        currentUser,
        titleInput,
        categoryInput,
        isTestInput === "true"
      );
      showBanner(
        `Listing created under ${currentUser?.email} with status 'Available'.`,
        false
      );
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Error creating listing"), true);
    }
  };

  const handleRequestItem = async (item: ListingItem) => {
    try {
      await createPendingRequest(currentUser, item);
      showBanner(
        `Request saved against listing '${item.title}' (${item.id}) by ${currentUser?.email}.`,
        false
      );
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Error creating request"), true);
    }
  };

  const handleAccept = async (req: RequestItem) => {
    try {
      await acceptIncomingRequest(req.id, req.listing_id);
      showBanner(
        "Request Accepted! Single-item listing is now locked as 'Reserved' (preventing reservation by a second person).",
        false
      );
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Error accepting request"), true);
    }
  };

  const handleReject = async (req: RequestItem) => {
    try {
      await rejectIncomingRequest(req.id);
      showBanner("Request Rejected by owner.", false);
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Error rejecting request"), true);
    }
  };

  const handleCancel = async (req: RequestItem) => {
    try {
      await cancelRequestAndRestoreAvailability(
        req.id,
        req.listing_id,
        req.request_status
      );
      showBanner(
        req.request_status === "Accepted"
          ? "Request Cancelled! Listing availability automatically restored from 'Reserved' back to 'Available'."
          : "Pending request Cancelled.",
        false
      );
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Error cancelling request"), true);
    }
  };

  const handleComplete = async (req: RequestItem) => {
    try {
      await completeItemHandover(req.id, req.listing_id);
      showBanner(
        "Handover Completed! Listing and request updated to 'Completed' and reuse counter incremented.",
        false
      );
    } catch (err: unknown) {
      showBanner(getErrorMessage(err, "Error completing handover"), true);
    }
  };

  const handleRunFaq = async () => {
    setFaqLoading(true);
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faqKey: selectedFaq,
          customQuestion: customQuestion.trim(),
          sessionQueryCount: faqLogs.length,
        }),
      });
      const data = await res.json();
      if (data.question && data.answer) {
        setFaqLogs((prev) => [data, ...prev]);
        setCustomQuestion("");
      }
    } catch {
      showBanner("Failed to query /api/faq server route", true);
    } finally {
      setFaqLoading(false);
    }
  };

  const successfulFaqCount = faqLogs.filter((l) => l.outcome === "SUCCESS").length;
  const failedFaqCount = faqLogs.filter((l) => l.outcome !== "SUCCESS").length;
  const totalTokensUsed = faqLogs.reduce((acc, log) => acc + log.tokensUsed, 0);

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "960px",
        margin: "24px auto",
        padding: "0 16px",
        color: "#1e293b",
      }}
    >
      <h1 style={{ color: "#0f172a", marginBottom: "6px" }}>
        UMLoop — Integrated Handover Workflow & Bounded FAQ Chatbot (KAN-60)
      </h1>
      <p style={{ fontSize: "14px", color: "#475569", marginTop: 0 }}>
        Live Deployed Verification: Two-User Auth • Request Decisions • Single-Item Reservation Lock • Cancellation/Completion Updates • Bounded AI FAQ with Usage Limits
      </p>

      {statusMessage && (
        <div
          style={{
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "18px",
            fontSize: "14px",
            background: statusMessage.isError ? "#fee2e2" : "#dcfce7",
            color: statusMessage.isError ? "#991b1b" : "#166534",
            border: `1px solid ${statusMessage.isError ? "#f87171" : "#4ade80"}`,
          }}
        >
          <strong>System Feedback:</strong> {statusMessage.text}
        </div>
      )}

      {/* Module 1: Authenticate the Two Test Users */}
      <section
        style={{
          background: "#ffffff",
          padding: "18px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>
          1. Authenticate the Two Test Users (@siswa.um.edu.my)
        </h2>
        <div
          style={{
            background: "#f8fafc",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            marginBottom: "14px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>
            1-Click Test User Switcher:
          </span>
          <button
            onClick={() =>
              handleQuickTestUserAuth("seller1@siswa.um.edu.my", "Test User 1 (Item Owner)")
            }
            style={{
              background: "#1d4ed8",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            Login as Test User 1 (Owner: seller1@siswa.um.edu.my)
          </button>
          <button
            onClick={() =>
              handleQuickTestUserAuth("buyer1@siswa.um.edu.my", "Test User 2 (Requester)")
            }
            style={{
              background: "#047857",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            Login as Test User 2 (Requester: buyer1@siswa.um.edu.my)
          </button>
        </div>

        {!currentUser ? (
          <div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
                  UM Student Email (Must end with @siswa.um.edu.my)
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
                  Password (Min 6 characters)
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                />
              </div>
            </div>
            <button
              onClick={handleRegister}
              style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginRight: "8px" }}
            >
              Register New Account
            </button>
            <button
              onClick={handleSignIn}
              style={{ background: "#059669", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "14px", margin: "6px 0 12px" }}>
              Active Authenticated Session: <strong>{currentUser.email}</strong> | UID:{" "}
              <code>{currentUser.uid}</code>
            </p>
            <button
              onClick={handleVerifyEmail}
              style={{ background: "#475569", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginRight: "8px" }}
            >
              Send Verification Email
            </button>
            <button
              onClick={handleSignOut}
              style={{ background: "#dc2626", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Sign Out
            </button>
          </div>
        )}
      </section>

      {/* Module 2: Create Listing & Reuse Counter */}
      <section
        style={{
          background: "#ffffff",
          padding: "18px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>
          2. Create Single-Item Listing & Reuse Counter
        </h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
              Item Title
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            >
              <option value="Exchange">Exchange</option>
              <option value="Donation">Donation</option>
              <option value="Affordable Resale">Affordable Resale</option>
              <option value="Recyclable">Recyclable</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
              Transaction Type (is_test flag)
            </label>
            <select
              value={isTestInput}
              onChange={(e) => setIsTestInput(e.target.value)}
              style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            >
              <option value="false">Real Handover (is_test: false)</option>
              <option value="true">Test Data (is_test: true)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleCreateListing}
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          Create Listing as Signed-In User
        </button>
        <span style={{ fontSize: "13px", color: "#475569", marginLeft: "12px" }}>
          Completed Real Handovers (Completed & is_test == false):{" "}
          <strong>{reuseCount}</strong>
        </span>
      </section>

      {/* Module 3: Listings & Preventing Double Reservation */}
      <section
        style={{
          background: "#ffffff",
          padding: "18px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>
          3. Listings & Single-Item Reservation Protection
        </h2>
        {listings.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#64748b" }}>No listings found. Create one above!</p>
        ) : (
          listings.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e2e8f0",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "10px",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <strong>{item.title}</strong>{" "}
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                  {item.category}
                </span>
                <span
                  style={{
                    background:
                      item.status === "Available"
                        ? "#dcfce7"
                        : item.status === "Reserved"
                        ? "#fef3c7"
                        : "#e2e8f0",
                    color:
                      item.status === "Available"
                        ? "#166534"
                        : item.status === "Reserved"
                        ? "#92400e"
                        : "#334155",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginLeft: "6px",
                  }}
                >
                  Status: {item.status}
                </span>
                <span style={{ background: "#e2e8f0", color: "#334155", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                  is_test: {String(item.is_test)}
                </span>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  Owner: {item.owner_email} | Listing ID: <code>{item.id}</code>
                </div>
              </div>
              <button
                disabled={item.status !== "Available"}
                onClick={() => handleRequestItem(item)}
                style={{
                  background: item.status === "Available" ? "#059669" : "#94a3b8",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "4px",
                  cursor: item.status === "Available" ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                }}
              >
                {item.status === "Available"
                  ? "Request This Listing"
                  : `Locked (${item.status} — Cannot Double-Reserve)`}
              </button>
            </div>
          ))
        )}
      </section>

      {/* Module 4: Owner Decisions (Accept / Reject) & Handover Updates (Cancel / Complete) */}
      <section
        style={{
          background: "#ffffff",
          padding: "18px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>
          4. Request Decisions (Accept / Reject) & Availability Updates (Cancel / Complete)
        </h2>
        {requests.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#64748b" }}>No requests recorded yet.</p>
        ) : (
          requests.map((req) => {
            const isOwner = Boolean(
              currentUser?.email &&
                req.owner_email &&
                currentUser.email.toLowerCase() === req.owner_email.toLowerCase()
            );
            const isRequester = Boolean(
              currentUser?.email &&
                req.requester_email &&
                currentUser.email.toLowerCase() === req.requester_email.toLowerCase()
            );

            return (
              <div
                key={req.id}
                style={{
                  border: "1px solid #e2e8f0",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "10px",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <strong>Listing: {req.listing_title}</strong>{" "}
                  <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                    Request Status: {req.request_status}
                  </span>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    Owner: {req.owner_email} | Requester: {req.requester_email} | Listing ID:{" "}
                    <code>{req.listing_id}</code>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {isOwner && req.request_status === "Pending" && (
                    <>
                      <button
                        onClick={() => handleAccept(req)}
                        style={{ background: "#059669", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Accept (Reserve Item)
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        style={{ background: "#dc2626", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isOwner && req.request_status === "Accepted" && (
                    <button
                      onClick={() => handleComplete(req)}
                      style={{ background: "#2563eb", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Confirm Handover Completed
                    </button>
                  )}

                  {(isOwner || isRequester) &&
                    (req.request_status === "Pending" || req.request_status === "Accepted") && (
                      <button
                        onClick={() => handleCancel(req)}
                        style={{ background: "#d97706", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Cancel Request (Restore Available)
                      </button>
                    )}

                  {req.request_status !== "Pending" && req.request_status !== "Accepted" && (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Decision Finalized ({req.request_status})
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Module 5: Bounded Chatbot Demonstration with Agreed Usage Limits */}
      <section
        style={{
          background: "#ffffff",
          padding: "18px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>
          5. Bounded FAQ Chatbot Demonstration (Approved FAQ Set & Usage Limits)
        </h2>

        {/* Metrics Bar recording Successful Answers, Failures, and Usage */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            marginBottom: "14px",
            fontSize: "13px",
          }}
        >
          <div>
            Session Usage Limit:{" "}
            <strong>
              {faqLogs.length} / {SESSION_QUERY_LIMIT} queries
            </strong>{" "}
            (Max 300 tokens/reply)
          </div>
          <div style={{ color: "#166534" }}>
            Successful Answers: <strong>{successfulFaqCount}</strong>
          </div>
          <div style={{ color: "#991b1b" }}>
            Failures / Guardrail Refusals: <strong>{failedFaqCount}</strong>
          </div>
          <div>
            Total Tokens Recorded: <strong>{totalTokensUsed}</strong>
          </div>
        </div>

        <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>
          Select from Approved UMLoop FAQ Set:
        </label>
        <select
          value={selectedFaq}
          onChange={(e) => setSelectedFaq(e.target.value)}
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "10px" }}
        >
          <option value="q1">Q1: Who is eligible to register and trade on UMLoop?</option>
          <option value="q2">Q2: What item categories are supported on UMLoop?</option>
          <option value="q3">Q3: How do item statuses (Available, Reserved, Completed) work during a handover or cancellation?</option>
          <option value="q4">Q4: Why can&apos;t I request my own listing or reserve an already-reserved item?</option>
          <option value="q5">Q5: How does UMLoop measure campus sustainability and separate test data?</option>
        </select>

        <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>
          Optional Custom Question (Test out-of-scope failure recording):
        </label>
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="Leave blank to ask selected approved FAQ, or type an unapproved question (e.g., 'What is the weather in KL?')..."
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "10px" }}
        />

        <button
          onClick={handleRunFaq}
          disabled={faqLoading}
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginRight: "8px" }}
        >
          {faqLoading ? "Querying /api/faq..." : "Ask Bounded FAQ Chatbot"}
        </button>
        <button
          onClick={() => setFaqLogs([])}
          style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
        >
          Reset Session Quota
        </button>

        {faqLogs.map((log, index) => (
          <div
            key={index}
            style={{
              borderLeft: `4px solid ${log.outcome === "SUCCESS" ? "#16a34a" : "#dc2626"}`,
              background: log.outcome === "SUCCESS" ? "#f0fdf4" : "#fef2f2",
              padding: "10px 14px",
              borderRadius: "4px",
              marginTop: "12px",
              fontSize: "14px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: log.outcome === "SUCCESS" ? "#dcfce7" : "#fee2e2",
                  color: log.outcome === "SUCCESS" ? "#166534" : "#991b1b",
                  marginRight: "8px",
                }}
              >
                {log.outcome}
              </span>
              <strong>Question:</strong> {log.question}
            </div>
            <div style={{ marginTop: "6px" }}>
              <strong>Response:</strong> {log.answer}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "6px" }}>
              Mode: <code>{log.mode}</code> | Latency: <code>{log.latencyMs} ms</code> | Usage:{" "}
              <code>{log.tokensUsed} tokens</code>
            </div>
          </div>
        ))}
      </section>

      {/* Module 6: Document Known Limitations (KAN-60 Deliverable Requirement) */}
      <section
        style={{
          background: "#f8fafc",
          padding: "18px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          marginBottom: "24px",
          fontSize: "13px",
          color: "#334155",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "16px", color: "#0f172a" }}>
          6. Documented Known Limitations (KAN-60 Deployment Notes)
        </h2>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.6" }}>
          <li>
            <strong>Prototype Email Verification Enforcement:</strong> While{" "}
            <code>@siswa.um.edu.my</code> domain suffix checks and Firebase verification emails are active, unverified accounts are permitted to test listing/request workflows in the prototype environment so evaluators can test with synthetic student accounts (<code>seller1@siswa.um.edu.my</code>, <code>buyer1@siswa.um.edu.my</code>).
          </li>
          <li>
            <strong>Single-Item Inventory Model:</strong> Each listing represents a single physical campus item (quantity = 1). Accepting one request immediately locks the listing status to <code>Reserved</code>; multi-quantity inventory pooling is out of scope for the current MVP.
          </li>
          <li>
            <strong>Chatbot Scope & Session Quota:</strong> The AI FAQ assistant is strictly bounded to 5 approved UMLoop policy topics with a session cap of 5 queries and 300 tokens per response. Multi-turn conversational memory and open-ended general queries are intentionally blocked by guardrails.
          </li>
          <li>
            <strong>Offline Handover Coordination:</strong> Physical item exchange occurs offline at designated UM campus locations (e.g., Central Library); in-app payment processing is excluded by design.
          </li>
        </ul>
      </section>
    </main>
  );
}
