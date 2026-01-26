"use server";

// Assume an AI flow exists at src/ai/flows/generateSalesReportSummary.ts
// For now, we will mock its behavior.
// import { generateSummary } from '@/ai/flows/generateSalesReportSummary';

type SalesReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
};

export async function getAiSalesReportSummary(filters: SalesReportFilters) {
  console.log("AI Action: Received filters for sales report summary:", filters);

  // Mock AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock AI response based on filters
  let summary = "This is a smart summary of your sales.\n";
  if (filters.dateFrom && filters.dateTo) {
    summary += `For the period from ${filters.dateFrom} to ${filters.dateTo}, `;
  } else if (filters.dateFrom) {
    summary += `Since ${filters.dateFrom}, `;
  } else if (filters.dateTo) {
    summary += `Up to ${filters.dateTo}, `;
  }

  summary += "your sales show a positive trend. ";

  if (filters.category && filters.category !== "all") {
    summary += `Focusing on the '${filters.category}' category, you've seen significant activity. Key products in this category are performing well. `;
  } else {
    summary += "Across all categories, 'Product X' and 'Service Y' are top performers. ";
  }

  summary += "Customer engagement is high, with repeat purchases contributing significantly to revenue. Consider exploring loyalty programs to further boost this. There's an opportunity to grow in the 'New Services' category based on recent inquiries.";

  // This is where you would call the actual Genkit flow:
  // const aiSummary = await generateSummary(filters, mockSalesData);
  // return aiSummary;

  return {
    summaryText: summary,
    keyInsights: [
      "Positive sales trend overall.",
      "Top performers: 'Product X' and 'Service Y'.",
      "High customer engagement and repeat purchases.",
      "Opportunity in 'New Services' category.",
    ],
    suggestedActions: [
      "Implement a customer loyalty program.",
      "Increase marketing for 'New Services'.",
      "Restock 'Product X' based on demand.",
    ],
    chartData: [ // Mock chart data
      { name: 'Jan', sales: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Feb', sales: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Mar', sales: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Apr', sales: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'May', sales: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Jun', sales: Math.floor(Math.random() * 5000) + 1000 },
    ]
  };
}

import { analyzeFeedbackFlow } from "@/ai/feedback";

export async function runFeedbackAnalysis(feedbackItems: { rating: number; comment: string }[]) {
  try {
    const result = await analyzeFeedbackFlow(feedbackItems);
    return result;
  } catch (error: any) {
    const errorMessage = error.message || "";
    const lowerError = errorMessage.toLowerCase();

    // Check for specific error messages to provide better feedback to the UI
    if (
      lowerError.includes("api key") ||
      lowerError.includes("api_key") ||
      lowerError.includes("configuration")
    ) {
      throw new Error("AI service configuration error. Please ensure GOOGLE_GENAI_API_KEY is correctly set in your environment.");
    }

    if (lowerError.includes("not found")) {
      throw new Error("AI Model not found (404). This usually means the model name is incorrect or not available in your region.");
    }

    throw new Error(errorMessage || "Failed to analyze feedback due to an unexpected error.");
  }
}
