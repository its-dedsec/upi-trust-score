export function extractUpiId(input: string): string {
  if (!input) return "";
  
  const trimmed = input.trim();
  
  // Check if it's a UPI intent URL or contains payment parameters
  if (trimmed.toLowerCase().includes("upi://pay") || trimmed.toLowerCase().includes("?pa=") || trimmed.toLowerCase().includes("&pa=")) {
    try {
      // Extract query string - handle both full URLs and raw query strings
      let queryString = "";
      
      if (trimmed.includes("?")) {
        queryString = trimmed.split("?")[1];
      } else if (trimmed.toLowerCase().startsWith("pa=")) {
        queryString = trimmed;
      } else {
        return trimmed; // Return as-is if no query params found
      }
      
      const params = new URLSearchParams(queryString);
      const pa = params.get("pa") || params.get("PA");
      
      if (pa) {
        return decodeURIComponent(pa);
      }
    } catch (error) {
      console.error("Error parsing UPI URL:", error);
      // Fallback: try to extract pa= manually
      const paMatch = trimmed.match(/[?&]pa=([^&]+)/i);
      if (paMatch && paMatch[1]) {
        return decodeURIComponent(paMatch[1]);
      }
    }
  }
  
  // Otherwise treat it as a direct UPI ID
  return trimmed;
}

export function createPaymentDeepLink(upiId: string, app: "gpay" | "phonepe" | "paytm"): string {
  const encodedUpi = encodeURIComponent(upiId);
  
  switch (app) {
    case "gpay":
      return `gpay://upi/pay?pa=${encodedUpi}`;
    case "phonepe":
      return `phonepe://pay?pa=${encodedUpi}`;
    case "paytm":
      return `paytmmp://pay?pa=${encodedUpi}`;
    default:
      return "";
  }
}

export function getRiskLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case "low":
      return "text-success";
    case "medium":
      return "text-warning";
    case "high":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function getRiskLevelBadge(level: string): "default" | "secondary" | "destructive" | "outline" {
  switch (level.toLowerCase()) {
    case "low":
      return "secondary";
    case "medium":
      return "outline";
    case "high":
      return "destructive";
    default:
      return "default";
  }
}
