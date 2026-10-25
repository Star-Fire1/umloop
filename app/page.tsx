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
  completeItemHandover,
} from "../backend/umloopBackend";

interface FaqLog {
  question: string;
  answer: string;
  tokensUsed: number;
  latencyMs: number;
  mode: string;
}

export default function UMLoopHomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [emailInput, setEmailInput] = useState("seller1@siswa.um.edu.my");
  const [passwordInput, setPasswordInput] = useState("123456");

  const [titleInput, setTitleInput] = useState("Used Engineering Calculus Textbook");
  const [categoryInput, setCategoryInput] = useState("Exchange");
  const [isTestInput, setIsTestInput] = useState("false");

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [reuseCount, setReuseCount] = useState(0);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  // KAN-53 AI FAQ State
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

  const handleRegister = async () => {
    try {
      showBanner("Registering account...", false);
      await registerUmStudent(emailInput, passwordInput);
      showBanner(`Account registered and signed in as: ${emailInput}`, false);
    } catch (err: any) {
      showBanner(err.message || "Registration failed", true);
    }
  };

  const handleSignIn = async () => {
    try {
      showBanner("Signing in...", false);
      await signInUmStudent(emailInput, passwordInput);
      showBanner(`Signed in successfully as: ${emailInput}`, false);
    } catch (err: any) {
      showBanner(err.message || "Sign-in failed", true);
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
    } catch (err: any) {
      showBanner(err.message || "Failed to send verification email", true);
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
        `Listing created successfully under signed-in user: ${currentUser?.email}`,
        false
      );
    } catch (err: any) {
      showBanner(err.message || "Error creating listing", true);
    }
  };

  const handleRequestItem = async (item: ListingItem) => {
    try {
      await createPendingRequest(currentUser, item);
      showBanner(
        `Pending request created successfully by ${currentUser?.email}`,
        false
      );
    } catch (err: any) {
      showBanner(err.message || "Error creating request", true);
    }
  };

  const handleAccept = async (req: RequestItem) => {
    try {
      await acceptIncomingRequest(req.id, req.listing_id);
      showBanner("Request accepted! Listing status locked to Reserved.", false);
    } catch (err: any) {
      showBanner(err.message || "Error accepting request", true);
    }
  };

  const handleReject = async (req: RequestItem) => {
    try {
      await rejectIncomingRequest(req.id);
      showBanner("Request rejected.", false);
    } catch (err: any) {
      showBanner(err.message || "Error rejecting request", true);
    }
  };

  const handleComplete = async (req: RequestItem) => {
    try {
      await completeItemHandover(req.id, req.listing_id);
      showBanner(
        "Handover completed! Both listing and request are now marked as Completed.",
        false
      );
    } catch (err: any) {
      showBanner(err.message || "Error completing handover", true);
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

  const totalTokensUsed = faqLogs.reduce((acc, log) => acc + log.tokensUsed, 0);

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "920px",
        margin: "24px auto",
        padding: "0 16px",
        color: "#1e293b",
      }}
    >
      <h1 style={{ color: "#0f172a", marginBottom: "8px" }}>
        UMLoop — Campus Resource Circulation Platform (KAN-44 Integrated)
      </h1>
      <p style={{ fontSize: "14px", color: "#475569", marginTop: 0 }}>
        Next.js + Firebase Auth & Firestore + Server-Side AI FAQ Route Deployed on Vercel
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
          {statusMessage.text}
        </div>
      )}

      {/* Module 1: KAN-49 Authentication */}
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
          1. UM Student Authentication (KAN-49)
        </h2>
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
            <p style={{ fontSize: "14px" }}>
              Signed in as: <strong>{currentUser.email}</strong> | UID:{" "}
              <code>{currentUser.uid}</code> | Email Verified:{" "}
              <span>{currentUser.emailVerified ? "Yes" : "Pending (Active for prototype)"}</span>
            </p>
            <button
              onClick={handleVerifyEmail}
              style={{ background: "#475569", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginRight: "8px" }}
            >
              Send Verification Email
            </button>
            <button
              onClick={handleSignOut}
              style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Sign Out (Switch Account)
            </button>
          </div>
        )}
      </section>

      {/* Module 2: KAN-50 & KAN-52 Create Listing */}
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
          2. Create a Listing & Sustainability Counter (KAN-50 & KAN-52)
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

      {/* Module 3: KAN-50 Available Listings */}
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
          3. Available Listings & Request Validation (KAN-50)
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
              }}
            >
              <div>
                <strong>{item.title}</strong>{" "}
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                  {item.category}
                </span>
                <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                  Status: {item.status}
                </span>
                <span style={{ background: "#e2e8f0", color: "#334155", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                  is_test: {String(item.is_test)}
                </span>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  Owner: {item.owner_email} | ID: <code>{item.id}</code>
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
                {item.status === "Available" ? "Request Item" : `Locked (${item.status})`}
              </button>
            </div>
          ))
        )}
      </section>

      {/* Module 4: KAN-51 Incoming Requests */}
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
          4. Incoming Requests & Owner Actions (KAN-51)
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
                }}
              >
                <div>
                  <strong>Item: {req.listing_title}</strong>{" "}
                  <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", marginLeft: "6px" }}>
                    Request Status: {req.request_status}
                  </span>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    Owner: {req.owner_email} | Requester: {req.requester_email} | Listing ID:{" "}
                    <code>{req.listing_id}</code>
                  </div>
                </div>
                <div>
                  {isOwner && req.request_status === "Pending" ? (
                    <>
                      <button
                        onClick={() => handleAccept(req)}
                        style={{ background: "#059669", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginRight: "6px" }}
                      >
                        Accept (Lock Item)
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        style={{ background: "#dc2626", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Reject
                      </button>
                    </>
                  ) : isOwner && req.request_status === "Accepted" ? (
                    <button
                      onClick={() => handleComplete(req)}
                      style={{ background: "#2563eb", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Mark Handover Completed
                    </button>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {isOwner ? "Action finalized" : `Waiting for owner (${req.owner_email})`}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Module 5: KAN-53 AI FAQ Assistant via Next.js Server Route */}
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
          5. AI FAQ Feasibility Test via Server Route `/api/faq` (KAN-53)
        </h2>
        <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>
          Select an Approved UMLoop FAQ Question:
        </label>
        <select
          value={selectedFaq}
          onChange={(e) => setSelectedFaq(e.target.value)}
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "10px" }}
        >
          <option value="q1">Q1: Who is eligible to register and trade on UMLoop?</option>
          <option value="q2">Q2: What item categories are supported on UMLoop?</option>
          <option value="q3">Q3: How do item statuses (Available, Reserved, Completed) work during a handover?</option>
          <option value="q4">Q4: Why can&apos;t I request my own listing or submit multiple requests for the same item?</option>
          <option value="q5">Q5: How does UMLoop measure campus sustainability and separate test data?</option>
        </select>

        <label style={{ display: "block", fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>
          Optional Custom Question (Test out-of-scope guardrail):
        </label>
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="Leave blank to use selected approved FAQ above, or type a custom question..."
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "10px" }}
        />

        <button
          onClick={handleRunFaq}
          disabled={faqLoading}
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          {faqLoading ? "Querying /api/faq..." : "Ask UMLoop AI Assistant"}
        </button>
        <span style={{ fontSize: "13px", color: "#475569", marginLeft: "12px" }}>
          Queries Run: <strong>{faqLogs.length}</strong> | Estimated Tokens:{" "}
          <strong>{totalTokensUsed}</strong>
        </span>

        {faqLogs.map((log, index) => (
          <div
            key={index}
            style={{
              borderLeft: "4px solid #2563eb",
              background: "#f1f5f9",
              padding: "10px 14px",
              borderRadius: "4px",
              marginTop: "12px",
              fontSize: "14px",
            }}
          >
            <div>
              <strong>Question:</strong> {log.question}
            </div>
            <div style={{ marginTop: "4px" }}>
              <strong>Answer:</strong> {log.answer}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "6px" }}>
              Route: <code>{log.mode}</code> | Latency: <code>{log.latencyMs} ms</code> | Usage:{" "}
              <code>{log.tokensUsed} tokens</code>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
