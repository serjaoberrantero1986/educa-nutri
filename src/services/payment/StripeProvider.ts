import { PaymentProvider, CreatePaymentDTO, PaymentResponse, PaymentGatewayConfig } from "./PaymentProvider";

export class StripeProvider implements PaymentProvider {
  public name = "Stripe";

  constructor() {}

  private getSecretKey(config?: PaymentGatewayConfig): string {
    return config?.stripe_secret_key || (typeof process !== "undefined" && process.env ? process.env.STRIPE_SECRET_KEY : "") || "";
  }

  private checkIsConfigured(config?: PaymentGatewayConfig): boolean {
    const key = this.getSecretKey(config);
    const paymentMode = config?.payment_mode || (typeof process !== "undefined" && process.env ? process.env.PAYMENT_MODE : "sandbox") || "sandbox";
    const isSandboxMode = paymentMode === "sandbox";
    const isPlaceholder = !key || 
                          key.includes("YOUR_") || 
                          key.includes("MY_") || 
                          key.includes("placeholder");
    return key.length > 10 && !isSandboxMode && !isPlaceholder;
  }

  public async createPayment(data: CreatePaymentDTO, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    if (!this.checkIsConfigured(config)) {
      // Simulate Stripe Sandbox transaction
      const randomId = `str-payment-${Date.now()}`;
      if (data.paymentMethod === "pix") {
        return {
          id: randomId,
          status: "pending",
          paymentMethod: "pix",
          amount: data.amount,
          qrCode: "STRIPE_SIMULATED_PIX_QR",
          qrCodeCopyPaste: "00020101021226870014br.gov.bcb.pix0125stripe_simulated_payment5204000053039865405" + data.amount.toFixed(2) + "5802BR5910SportNutri6009Sao Paulo62070503***6304abcd"
        };
      } else {
        return {
          id: randomId,
          status: "approved",
          statusDetail: "succeeded",
          paymentMethod: "card",
          amount: data.amount
        };
      }
    }

    try {
      // Real Stripe PaymentIntent integration using native fetch requests
      const url = "https://api.stripe.com/v1/payment_intents";
      const params = new URLSearchParams();
      params.append("amount", Math.round(data.amount * 100).toString()); // Stripe expects cents
      params.append("currency", "brl");
      params.append("payment_method_types[]", data.paymentMethod === "pix" ? "pix" : "card");
      params.append("description", data.description || "SportNutri Payment");
      params.append("receipt_email", data.email);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getSecretKey(config)}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Stripe Payment Creation failed");
      }

      const intent = await response.json();
      
      let status: PaymentResponse["status"] = "pending";
      if (intent.status === "succeeded") status = "approved";
      if (intent.status === "requires_payment_method") status = "rejected";
      if (intent.status === "canceled") status = "cancelled";

      return {
        id: intent.id,
        status,
        statusDetail: intent.status,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        initPoint: intent.next_action?.use_stripe_sdk?.stripe_js || intent.client_secret
      };
    } catch (err: any) {
      console.error("[StripeProvider] Error creating payment:", err);
      throw err;
    }
  }

  public async getPaymentStatus(paymentId: string, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    if (!this.checkIsConfigured(config) || paymentId.startsWith("str-")) {
      return {
        id: paymentId,
        status: "approved",
        statusDetail: "succeeded",
        paymentMethod: "pix",
        amount: 19.90
      };
    }

    try {
      const url = `https://api.stripe.com/v1/payment_intents/${paymentId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.getSecretKey(config)}`
        }
      });

      if (!response.ok) {
        throw new Error(`Stripe API error querying payment: ${response.status}`);
      }

      const intent = await response.json();
      let status: PaymentResponse["status"] = "pending";
      if (intent.status === "succeeded") status = "approved";
      if (intent.status === "requires_payment_method") status = "rejected";
      if (intent.status === "canceled") status = "cancelled";

      return {
        id: intent.id,
        status,
        statusDetail: intent.status,
        paymentMethod: intent.payment_method_types?.[0] === "pix" ? "pix" : "card",
        amount: intent.amount / 100
      };
    } catch (err) {
      console.error("[StripeProvider] Error checking status:", err);
      throw err;
    }
  }
}
