export function extractUpiId(input: string): string {
  if (!input) return "";
  
  // Check if it's a UPI intent URL
  if (input.toLowerCase().includes("upi://pay") || input.includes("?pa=")) {
    const queryString = input.includes("?") ? input.split("?")[1] : input;
    const params = new URLSearchParams(queryString);
    const pa = params.get("pa") || params.get("PA");
    return pa ? decodeURIComponent(pa) : "";
  }
  
  // Otherwise treat it as a direct UPI ID
  return input.trim();
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
