import { PaymentProvider, CreatePaymentDTO, PaymentResponse, PaymentGatewayConfig } from "./PaymentProvider";

export class MercadoPagoProvider implements PaymentProvider {
  public name = "Mercado Pago";

  constructor() {}

  private getAccessToken(config?: PaymentGatewayConfig): string {
    const configToken = (config?.mercado_pago_access_token || "").trim();
    const envToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();

    return configToken || envToken || "";
  }

  private checkIsConfigured(config?: PaymentGatewayConfig): boolean {
    const token = this.getAccessToken(config);

    const isPlaceholder =
      !token ||
      token.includes("YOUR_") ||
      token.includes("MY_") ||
      token.includes("placeholder") ||
      token === "undefined" ||
      token === "null";

    if (isPlaceholder || token.length <= 20) {
      return false;
    }

    return token.startsWith("APP_USR-") || token.startsWith("TEST-");
  }

  /**
   * Generates a mathematically valid random CPF string.
   * Mercado Pago validates CPF structures using the mod11 checksum.
   * Passing a non-valid structure (like "11111111111") causes instant API rejection.
   */
  private generateValidCPF(): string {
    const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    
    // First verification digit calculation
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += randomDigits[i] * (10 - i);
    }
    let d1 = 11 - (sum % 11);
    if (d1 >= 10) d1 = 0;
    randomDigits.push(d1);
    
    // Second verification digit calculation
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += randomDigits[i] * (11 - i);
    }
    let d2 = 11 - (sum % 11);
    if (d2 >= 10) d2 = 0;
    randomDigits.push(d2);
    
    return randomDigits.join("");
  }

  /**
   * Helper to perform requests to the Mercado Pago API with safety timeouts
   */
  private async apiRequest(endpoint: string, method: string, body?: any, config?: PaymentGatewayConfig): Promise<any> {
    const url = `https://api.mercadopago.com${endpoint}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.getAccessToken(config)}`,
      "Content-Type": "application/json",
      "x-idempotency-key": `idemp-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    };

    console.log(`[MercadoPago HTTP] ${method} ${url}`);
    
    // Create an AbortController for a 6-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const json = await response.json();
      if (!response.ok) {
        console.error("[MercadoPago Error Response]", json);
        throw new Error(json.message || `Request failed with status ${response.status}`);
      }
      return json;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Mercado Pago API request timed out (6 seconds)");
      }
      throw err;
    }
  }

  public async createPayment(data: CreatePaymentDTO, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    if (!this.checkIsConfigured(config)) {
      throw new Error("Mercado Pago não está configurado. Verifique o Access Token de produção (APP_USR-...) nas configurações.");
    }

    try {
      const validCpf = this.generateValidCPF();
      
      // Build body following Mercado Pago V1 Payments schema
      const paymentBody: any = {
        transaction_amount: Number(data.amount),
        description: data.description,
        payer: {
          email: data.email,
          first_name: data.firstName || "Cliente",
          last_name: data.lastName || "SportNutri",
          identification: {
            type: "CPF",
            number: validCpf
          }
        },
        installments: data.installments || 1
      };

      if (data.paymentMethod === "pix") {
        paymentBody.payment_method_id = "pix";
      } else {
        paymentBody.payment_method_id = "visa"; // Fallback identifier
        paymentBody.token = data.token;
        if (data.issuerId) {
          paymentBody.issuer_id = data.issuerId;
        }
      }

      const mpResponse = await this.apiRequest("/v1/payments", "POST", paymentBody, config);

      // Parse status
      let paymentStatus: PaymentResponse["status"] = "pending";
      const statusMap: Record<string, PaymentResponse["status"]> = {
        pending: "pending",
        in_process: "pending",
        approved: "approved",
        rejected: "rejected",
        cancelled: "cancelled",
        refunded: "cancelled",
        charged_back: "cancelled"
      };

      if (mpResponse.status && statusMap[mpResponse.status]) {
        paymentStatus = statusMap[mpResponse.status];
      }

      const pointOfInteraction = mpResponse.point_of_interaction || {};
      const transactionData = pointOfInteraction.transaction_data || {};

      return {
        id: String(mpResponse.id),
        status: paymentStatus,
        statusDetail: mpResponse.status_detail,
        paymentMethod: data.paymentMethod,
        amount: Number(mpResponse.transaction_amount),
        qrCode: transactionData.qr_code_base64 || undefined,
        qrCodeCopyPaste: transactionData.qr_code || undefined,
        initPoint: mpResponse.sandbox_init_point || mpResponse.init_point || undefined
      };
    } catch (error: any) {
      console.error("[MercadoPago Provider] Error creating payment:", error);
      throw new Error(error?.message || "Erro real do Mercado Pago ao criar pagamento.");
    }
  }

  public async getPaymentStatus(paymentId: string, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    if (!this.checkIsConfigured(config)) {
      throw new Error("Mercado Pago não está configurado para buscar status de pagamento.");
    }

    try {
      const mpResponse = await this.apiRequest(`/v1/payments/${paymentId}`, "GET", undefined, config);

      let paymentStatus: PaymentResponse["status"] = "pending";
      const statusMap: Record<string, PaymentResponse["status"]> = {
        pending: "pending",
        in_process: "pending",
        approved: "approved",
        rejected: "rejected",
        cancelled: "cancelled",
        refunded: "cancelled"
      };

      if (mpResponse.status && statusMap[mpResponse.status]) {
        paymentStatus = statusMap[mpResponse.status];
      }

      const pointOfInteraction = mpResponse.point_of_interaction || {};
      const transactionData = pointOfInteraction.transaction_data || {};

      return {
        id: String(mpResponse.id),
        status: paymentStatus,
        statusDetail: mpResponse.status_detail,
        paymentMethod: mpResponse.payment_method_id === "pix" ? "pix" : "card",
        amount: Number(mpResponse.transaction_amount),
        qrCode: transactionData.qr_code_base64 || undefined,
        qrCodeCopyPaste: transactionData.qr_code || undefined
      };
    } catch (error: any) {
      console.error(`[MercadoPago Provider] Error fetching status for payment ${paymentId}:`, error);
      throw error;
    }
  }
}
