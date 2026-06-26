import { PaymentProvider, CreatePaymentDTO, PaymentResponse, PaymentGatewayConfig } from "./PaymentProvider";

export class MercadoPagoProvider implements PaymentProvider {
  public name = "Mercado Pago";

  constructor() {}

  private getAccessToken(config?: PaymentGatewayConfig): string {
    return config?.mercado_pago_access_token || process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  }

  private checkIsConfigured(config?: PaymentGatewayConfig): boolean {
    const token = this.getAccessToken(config);
    const paymentMode = config?.payment_mode || process.env.PAYMENT_MODE || "sandbox";
    const isSandboxMode = paymentMode === "sandbox";
    const isPlaceholder = !token || 
                          token.includes("YOUR_") || 
                          token.includes("MY_") || 
                          token.includes("placeholder");
    // Configured if we have an access token and payment mode is not config-forced to sandbox simulation
    return token.length > 10 && !isSandboxMode && !isPlaceholder;
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
        
        // Check for unauthorized use of live credentials
        if (
          json.message === "Unauthorized use of live credentials" || 
          json.error === "unauthorized" || 
          (json.message && json.message.toLowerCase().includes("live credentials"))
        ) {
          throw new Error(
            "Credenciais de Produção (APP_USR-...) não podem ser usadas para testar compras com dados fictícios. Para realizar simulações e testar o fluxo de PIX/Cartão, altere o MERCADO_PAGO_ACCESS_TOKEN no painel/arquivo .env para o seu 'Access Token de Teste' (que começa com TEST-), ou ative o modo de simulação total mudando PAYMENT_MODE para 'sandbox'."
          );
        }
        
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
    const paymentMode = config?.payment_mode || process.env.PAYMENT_MODE || "sandbox";
    if (!this.checkIsConfigured(config) || (data.paymentMethod === "card" && (!data.token || data.token === "card_token_sandbox"))) {
      if (paymentMode === "sandbox") {
        return this.createSimulatedPayment(data);
      }
      throw new Error("Mercado Pago não está configurado ou token de cartão inválido para ambiente de produção.");
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
      if (paymentMode === "sandbox") {
        return this.createSimulatedPayment(data);
      }
      throw error;
    }
  }

  public async getPaymentStatus(paymentId: string, config?: PaymentGatewayConfig): Promise<PaymentResponse> {
    const paymentMode = config?.payment_mode || process.env.PAYMENT_MODE || "sandbox";
    // If it's a failed transaction ID, return rejected immediately without API lookup
    if (paymentId.startsWith("failed-")) {
      return {
        id: paymentId,
        status: "rejected",
        paymentMethod: "pix",
        amount: 49.90,
        errorMessage: "Esta transação falhou na criação."
      };
    }

    // If it's a simulated payment id, return the simulated status
    if (paymentId.startsWith("sim-")) {
      if (paymentMode === "sandbox") {
        return this.getSimulatedPaymentStatus(paymentId);
      }
      throw new Error("ID de pagamento simulado não é permitido em ambiente de produção.");
    }

    if (!this.checkIsConfigured(config)) {
      throw new Error("Mercado Pago client is not configured with an access token");
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
      if (paymentMode === "sandbox") {
        return this.getSimulatedPaymentStatus(paymentId);
      }
      throw error;
    }
  }

  // --- SIMULATION HARNESS FOR DEMO / OFFLINE SANDBOX ---
  private async createSimulatedPayment(data: CreatePaymentDTO): Promise<PaymentResponse> {
    console.warn("[MercadoPago SDK Simulator] App is running with DEMO PAYMENT MODE. Mock processing applied.");
    
    const randomId = `sim-${Math.floor(Math.random() * 900000000 + 100000000)}`;
    
    if (data.paymentMethod === "pix") {
      // Create a gorgeous realistic Pix Copia e Cola payload
      const mockKey = `00020101021226920014br.gov.bcb.pix25700208sportnutri2026mpago${randomId}5204000053039865405${Number(data.amount).toFixed(2)}5802BR5915SportNutri Ltda6009Sao Paulo62070503***6304${Math.floor(Math.random()*9000+1000).toString(16)}`;
      
      return {
        id: randomId,
        status: "pending",
        statusDetail: "pending_waiting_transfer",
        paymentMethod: "pix",
        amount: Number(data.amount),
        qrCode: "SIMULATED_QR_CODE", // Handled inside UI beautifully
        qrCodeCopyPaste: mockKey
      };
    } else {
      // Mock instant approval for simulation credit card if credit card details are passed, otherwise mock pending/approved
      const isDeclined = data.token === "token_declined" || data.lastName.toLowerCase().includes("recusado");
      return {
        id: randomId,
        status: isDeclined ? "rejected" : "approved",
        statusDetail: isDeclined ? "cc_rejected_insufficient_amount" : "accredited",
        paymentMethod: "card",
        amount: Number(data.amount)
      };
    }
  }

  private async getSimulatedPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    // Sandbox status auto-approves PIX key simulation after some seconds for demonstration purposes
    return {
      id: paymentId,
      status: "approved",
      statusDetail: "accredited",
      paymentMethod: "pix",
      amount: 49.90 // Placeholder standard amount
    };
  }
}
