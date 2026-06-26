import { PaymentProvider, CreatePaymentDTO, PaymentResponse, PaymentGatewayConfig } from "./PaymentProvider";

export class PayPalProvider implements PaymentProvider {
  public name = "PayPal";

  constructor() {}

  private getClientId(config?: PaymentGatewayConfig): string {
    return config?.paypal_client_id || (typeof process !== "undefined" && process.env ? process.env.PAYPAL_CLIENT_ID : "") || "";
  }

  private getClientSecret(config?: PaymentGatewayConfig): string {
    return config?.paypal_client_secret || (typeof process !== "undefined" && process.env ? process.env.PAYPAL_CLIENT_SECRET : "") || "";
  }

  private checkIsConfigured(config?: PaymentGatewayConfig): boolean {
    const clientId = this.getClientId(config);
    const clientSecret = this.getClientSecret(config);
    const isPlaceholder = !clientId || 
                          clientId.includes("YOUR_") || 
                          clientId.includes("placeholder");
    return clientId.length > 10 && clientSecret.length > 10 && !isPlaceholder;
  }

  public async createPayment(data: CreatePaymentDTO, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    if (!this.checkIsConfigured(config)) {
      throw new Error("PayPal não está configurado para produção. Verifique o Client ID e Client Secret.");
    }

    try {
      // Fetch access token from PayPal
      const paymentMode = config?.payment_mode || (typeof process !== "undefined" && process.env ? process.env.PAYMENT_MODE : "live") || "live";
      const isSandboxMode = paymentMode === "sandbox";
      const apiBase = isSandboxMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
      
      const authHeader = Buffer.from(`${this.getClientId(config)}:${this.getClientSecret(config)}`).toString("base64");
      
      const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      });

      if (!tokenResponse.ok) {
        throw new Error("PayPal OAuth token request failed");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Create Order in PayPal V2 API
      const orderBody = {
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "BRL",
            value: data.amount.toFixed(2)
          },
          description: data.description || "SportNutri Payment"
        }],
        application_context: {
          brand_name: "SportNutri",
          landing_page: "BILLING",
          user_action: "PAY_NOW"
        }
      };

      const orderResponse = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderBody)
      });

      if (!orderResponse.ok) {
        const errData = await orderResponse.json().catch(() => ({}));
        throw new Error(errData.message || "PayPal order creation failed");
      }

      const order = await orderResponse.json();
      const approvalLink = order.links?.find((link: any) => link.rel === "approve")?.href || "";

      return {
        id: order.id,
        status: "pending",
        statusDetail: order.status,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        initPoint: approvalLink
      };
    } catch (err: any) {
      console.error("[PayPalProvider] Error creating payment:", err);
      throw err;
    }
  }

  public async getPaymentStatus(paymentId: string, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    if (!this.checkIsConfigured(config)) {
      throw new Error("PayPal não está configurado.");
    }

    try {
      const paymentMode = config?.payment_mode || (typeof process !== "undefined" && process.env ? process.env.PAYMENT_MODE : "live") || "live";
      const isSandboxMode = paymentMode === "sandbox";
      const apiBase = isSandboxMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
      const authHeader = Buffer.from(`${this.getClientId(config)}:${this.getClientSecret(config)}`).toString("base64");
      
      const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      });

      if (!tokenResponse.ok) {
        throw new Error("PayPal OAuth token request failed");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const orderResponse = await fetch(`${apiBase}/v2/checkout/orders/${paymentId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });

      if (!orderResponse.ok) {
        throw new Error("PayPal Order Query failed");
      }

      const order = await orderResponse.json();
      let status: PaymentResponse["status"] = "pending";
      if (order.status === "APPROVED" || order.status === "COMPLETED") {
        status = "approved";
      } else if (order.status === "VOIDED" || order.status === "CANCELLED") {
        status = "cancelled";
      }

      return {
        id: order.id,
        status,
        statusDetail: order.status,
        paymentMethod: "card",
        amount: Number(order.purchase_units?.[0]?.amount?.value || 0)
      };
    } catch (err) {
      console.error("[PayPalProvider] Error querying status:", err);
      throw err;
    }
  }
}
