import { NextRequest, NextResponse } from "next/server";

const MOCK_REPLIES = [
  "Thank you for reaching out! I'd be happy to help you find the right product. Could you tell me a bit more about what you're looking for?",
  "That's a great question! Based on what you've described, I'd recommend checking out our bestselling items in that category. Would you like me to narrow it down further?",
  "I completely understand your concern. Let me look into that for you. In the meantime, our products in this range typically come with a satisfaction guarantee.",
  "Absolutely! We have several options that would work well for your needs. The most popular choice among customers with similar preferences is our premium line.",
  "I appreciate your patience! Here's what I found: we have items available in various price ranges. Would you prefer something budget-friendly or are you open to premium options?",
  "Great choice! That product has excellent reviews from customers. It's currently in stock and ships within 2-3 business days. Shall I add it to your cart?",
  "I understand that can be frustrating. Let me suggest an alternative that many customers have found works even better for their specific situation.",
  "Thank you for the details! Based on your skin type and preferences, I'd recommend our gentle formula. It's fragrance-free and dermatologist-tested.",
  "That's a really common question! The main difference between those two products is the concentration of active ingredients. The premium version is more suitable for sensitive skin.",
  "I'm glad I could help! Is there anything else you'd like to know about our products or shipping options? We also have a loyalty program you might be interested in.",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;
    if (typeof message !== "string") {
      return NextResponse.json(
        { error: "Expected { message: string }" },
        { status: 400 },
      );
    }

    // Pick a reply based on message content hash for some variety but determinism
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = (hash * 31 + message.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % MOCK_REPLIES.length;

    return NextResponse.json({ reply: MOCK_REPLIES[index] });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
