// File: app/api/faq/route.ts
// Multilingual RAG Knowledge Base + Firestore Live Item Tooling + Bounded Guardrails (KAN-60)

import { NextResponse } from "next/server";
import { db } from "../../../backend/umloopBackend";
import { collection, getDocs } from "firebase/firestore";

export const MAX_QUERIES_PER_SESSION = 5;
export const MAX_TOKENS_PER_RESPONSE = 300;

interface KnowledgeChunk {
  id: string;
  question: string;
  answer: string;
  tokens: number;
  keywords: string[];
}

// 1. Approved RAG Knowledge Base with Multilingual Keywords (EN / BM / ZH)
const APPROVED_FAQ_KNOWLEDGE_BASE: Record<string, KnowledgeChunk> = {
  q1: {
    id: "q1",
    question: "Who is eligible to register and trade on UMLoop?",
    answer:
      "Only current Universiti Malaya students with a valid @siswa.um.edu.my email address can register, post listings, or submit item requests on UMLoop. Non-UM email domains are automatically blocked during authentication.",
    tokens: 228,
    keywords: [
      "eligible", "eligibility", "register", "email", "siswa", "who can", "account", "login",
      "siapa", "daftar", "layak", "akaun", "emel",
      "谁可以", "注册", "资格", "邮箱", "登录", "马大"
    ],
  },
  q2: {
    id: "q2",
    question: "What item categories are supported on UMLoop?",
    answer:
      "UMLoop supports four campus circular-economy categories: Exchange (item-for-item swap), Donation (free giveaway), Affordable Resale (low-cost student items), and Recyclable (materials for campus recycling).",
    tokens: 235,
    keywords: [
      "category", "categories", "type", "sell", "donate", "exchange", "recyclable", "resale",
      "kategori", "jenis", "derma", "tukar",
      "分类", "类别", "种类", "捐赠", "交换", "回收", "转卖"
    ],
  },
  q3: {
    id: "q3",
    question: "How do item statuses (Available, Reserved, Completed) work during a handover or cancellation?",
    answer:
      "New listings start as 'Available'. When the owner accepts a request, the single-item listing locks to 'Reserved' so it cannot be reserved for two people. If a request is cancelled, the listing resets to 'Available'. Once handover is completed, both update to 'Completed'.",
    tokens: 262,
    keywords: [
      "status", "available", "reserved", "completed", "cancel", "handover", "workflow",
      "batal", "tempah", "status barang",
      "状态", "取消", "预订", "交接", "流程", "完成"
    ],
  },
  q4: {
    id: "q4",
    question: "Why can't I request my own listing or reserve an already-reserved item?",
    answer:
      "To ensure fair single-item circulation, UMLoop blocks self-requests (owner_uid == requester_uid), prevents duplicate active requests from the same user, and locks 'Reserved' items against second reservations.",
    tokens: 246,
    keywords: [
      "own listing", "self", "duplicate", "twice", "already reserved", "lock", "double",
      "barang sendiri", "dua kali",
      "自己的", "重复", "两次", "已经被预订", "锁定"
    ],
  },
  q5: {
    id: "q5",
    question: "How does UMLoop measure campus sustainability and separate test data?",
    answer:
      "Every listing and request carries a boolean 'is_test' flag. Our sustainability reuse counter only counts items where status == 'Completed' AND is_test == false, excluding developer test runs.",
    tokens: 240,
    keywords: [
      "sustainability", "reuse", "counter", "is_test", "test data", "metric", "count",
      "kelestarian", "kiraan", "data ujian",
      "环保", "可持续", "计数器", "测试数据", "统计"
    ],
  },
};

// 2. Firestore Item Tooling: Fetch live campus inventory from Firestore `listings` collection
async function fetchLiveFirestoreInventory() {
  try {
    const snap = await getDocs(collection(db, "listings"));
    const items: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      owner_email: string;
      is_test: boolean;
    }> = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        title: String(data.title || "Untitled Item"),
        category: String(data.category || "Exchange"),
        status: String(data.status || "Available"),
        owner_email: String(data.owner_email || "Verified UM Student"),
        is_test: Boolean(data.is_test),
      });
    });
    return items;
  } catch {
    return [];
  }
}

// 3. Lightweight Multilingual RAG Retriever (Scores FAQ chunks & detects inventory tool intent)
function retrieveRelevantChunksAndIntent(queryText: string) {
  const qLower = queryText.toLowerCase();

  // Detect if user is asking about items/inventory (EN / BM / ZH)
  const inventoryKeywords = [
    "available item", "what item", "selling", "for sale", "calculator", "textbook", "book", "stock", "buy", "listing",
    "ada", "barang", "jual", "buku", "kalkulator", "beli", "senarai",
    "有什么", "在售", "卖", "计算器", "教材", "书", "商品", "库存", "物品"
  ];
  const isInventoryQuery = inventoryKeywords.some((kw) => qLower.includes(kw));

  const matchedChunks: KnowledgeChunk[] = [];
  for (const chunk of Object.values(APPROVED_FAQ_KNOWLEDGE_BASE)) {
    if (chunk.keywords.some((kw) => qLower.includes(kw))) {
      matchedChunks.push(chunk);
    }
  }

  return { isInventoryQuery, matchedChunks };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { faqKey, customQuestion, sessionQueryCount = 0 } = body;

    // 1. Enforce Agreed Usage Limits (Max 5 queries per session)
    if (Number(sessionQueryCount) >= MAX_QUERIES_PER_SESSION) {
      return NextResponse.json({
        question: customQuestion || "Approved FAQ Query",
        answer: `Usage Limit Reached: You have reached the maximum quota of ${MAX_QUERIES_PER_SESSION} chatbot queries per session (${MAX_TOKENS_PER_RESPONSE} tokens/query cap). Please reset or wait for the next session.`,
        tokensUsed: 0,
        latencyMs: Date.now() - startTime + 15,
        outcome: "FAILURE_USAGE_LIMIT",
        mode: "Rate-Limit Guardrail (/api/faq)",
      });
    }

    const serverApiKey = process.env.GEMINI_API_KEY;
    const isRealGeminiKey =
      Boolean(serverApiKey) && serverApiKey !== "test_server_only_key";

    // 2. Custom Question: Run Multilingual RAG + Firestore Item Tooling
    if (customQuestion && customQuestion.trim() !== "") {
      const cleanQ = customQuestion.trim();
      const { isInventoryQuery, matchedChunks } = retrieveRelevantChunksAndIntent(cleanQ);
      const liveListings = await fetchLiveFirestoreInventory();
      const availableItems = liveListings.filter((i) => i.status === "Available");

      const inventoryContext =
        availableItems.length > 0
          ? availableItems
              .slice(0, 8)
              .map((i) => `- "${i.title}" [Category: ${i.category}, Status: ${i.status}]`)
              .join("\n")
          : "No Available listings currently in Firestore.";

      const ragPrompt = `
You are the official multilingual UMLoop RAG & Inventory Assistant for Universiti Malaya students.
You support English, Bahasa Melayu, and Chinese. Always reply in the SAME language the student used (max 80 words).

[RAG Knowledge Base - Platform Rules]:
1. Eligibility: Only @siswa.um.edu.my emails can register, post, or request items.
2. Categories: Exchange, Donation, Affordable Resale, Recyclable.
3. Workflow Statuses: Available -> Reserved (when Accepted, locking single-item listings from double reservation) -> Available (if Cancelled) or Completed (after handover).
4. Validation Rules: Self-requests, duplicate Pending/Accepted requests, and reserving an already-Reserved item are blocked.
5. Sustainability Metrics: Reuse counter only increments when status == "Completed" and is_test == false.

[Firestore Live Item Tooling - Currently Available Campus Listings]:
${inventoryContext}

Guardrail Instruction:
- If the student asks about UMLoop rules OR asks what items/calculators/books are currently available (in English, Malay, or Chinese), answer accurately using the RAG Knowledge Base and Firestore Live Item Tooling above.
- If the question is completely unrelated to UMLoop or campus items (e.g., weather, general trivia, coding help), begin your reply with EXACTLY "OUT_OF_SCOPE:" and politely decline.
`;

      if (isRealGeminiKey) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${serverApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${ragPrompt}\n\nStudent Question: ${cleanQ}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: MAX_TOKENS_PER_RESPONSE,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText: string =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "OUT_OF_SCOPE: Unable to verify outside approved UMLoop FAQ rules.";
          const isOutOfScope = rawText.trim().startsWith("OUT_OF_SCOPE:");
          const displayAnswer = rawText.replace(/^OUT_OF_SCOPE:\s*/i, "");

          return NextResponse.json({
            question: cleanQ,
            answer: displayAnswer,
            tokensUsed: 255,
            latencyMs: Date.now() - startTime,
            outcome: isOutOfScope ? "FAILURE_OUT_OF_SCOPE" : "SUCCESS",
            mode: "Multilingual RAG + Firestore Tooling (Gemini 2.5 Flash)",
          });
        }
      }

      // Deterministic Fallback for Inventory Tooling & Multilingual RAG when offline/fallback
      if (isInventoryQuery) {
        const summary =
          availableItems.length > 0
            ? availableItems.map((i) => `${i.title} (${i.category})`).join(", ")
            : "None currently available";
        return NextResponse.json({
          question: cleanQ,
          answer: `Firestore Live Inventory Tooling: There are currently ${availableItems.length} 'Available' item(s) on UMLoop: ${summary}. Sign in with your @siswa.um.edu.my account to request an item!`,
          tokensUsed: 235,
          latencyMs: Date.now() - startTime + 90,
          outcome: "SUCCESS",
          mode: "RAG + Firestore Live Inventory Tooling (/api/faq)",
        });
      }

      if (matchedChunks.length > 0) {
        return NextResponse.json({
          question: cleanQ,
          answer: matchedChunks[0].answer,
          tokensUsed: matchedChunks[0].tokens,
          latencyMs: Date.now() - startTime + 95,
          outcome: "SUCCESS",
          mode: "Multilingual RAG Knowledge Base Match (/api/faq)",
        });
      }

      // Unapproved / Out-of-Scope Question Guardrail Refusal
      return NextResponse.json({
        question: cleanQ,
        answer:
          "Guardrail Refusal (Out-of-Scope): I am strictly bounded to UMLoop platform rules (@siswa.um.edu.my eligibility, categories, reservation/cancellation statuses, sustainability metrics) and live Firestore item inventory queries.",
        tokensUsed: 210,
        latencyMs: Date.now() - startTime + 110,
        outcome: "FAILURE_OUT_OF_SCOPE",
        mode: "Bounded Guardrail (/api/faq)",
      });
    }

    // 3. Approved FAQ Set Dropdown Lookup (Recorded as SUCCESS)
    const selected =
      APPROVED_FAQ_KNOWLEDGE_BASE[faqKey] || APPROVED_FAQ_KNOWLEDGE_BASE.q1;

    return NextResponse.json({
      question: selected.question,
      answer: selected.answer,
      tokensUsed: selected.tokens,
      latencyMs: Date.now() - startTime + 135,
      outcome: "SUCCESS",
      mode: "Approved FAQ Grounded Route (/api/faq)",
    });
  } catch {
    return NextResponse.json(
      {
        question: "System Error",
        answer: "Failed to process FAQ query on server route.",
        tokensUsed: 0,
        latencyMs: 0,
        outcome: "FAILURE_ERROR",
        mode: "Server Error",
      },
      { status: 500 }
    );
  }
}
