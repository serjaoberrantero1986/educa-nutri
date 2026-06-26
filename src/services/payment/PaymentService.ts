import { PaymentProvider, CreatePaymentDTO, PaymentResponse } from "./PaymentProvider";
import { MercadoPagoProvider } from "./MercadoPagoProvider";
import { GooglePlayBillingProvider } from "./GooglePlayBillingProvider";
import { StripeProvider } from "./StripeProvider";
import { PayPalProvider } from "./PayPalProvider";

class PaymentService {
  private activeProvider!: PaymentProvider;

  constructor() {
    this.updateProviderFromConfig();
  }

  /**
   * Determine and load active provider
   */
  private updateProviderFromConfig(): void {
    const isAndroidApp = typeof window !== "undefined" && 
      (window as any).Capacitor && 
      (window as any).Capacitor.getPlatform() === "android";

    if (isAndroidApp) {
      console.log("[PaymentService] Capacitor Android detected. Loading native Google Play Billing Provider.");
      this.activeProvider = new GooglePlayBillingProvider();
      return;
    }

    let activeGateway = "mercado_pago";
    
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("sportnutri_store_config");
        if (cached) {
          const config = JSON.parse(cached);
          if (config.active_payment_gateway) {
            activeGateway = config.active_payment_gateway;
          }
        }
      } catch (err) {}
    } else {
      activeGateway = process.env.ACTIVE_PAYMENT_GATEWAY || "mercado_pago";
    }

    console.log(`[PaymentService] Loading payment gateway: ${activeGateway}`);

    if (activeGateway === "stripe") {
      this.activeProvider = new StripeProvider();
    } else if (activeGateway === "paypal") {
      this.activeProvider = new PayPalProvider();
    } else {
      this.activeProvider = new MercadoPagoProvider();
    }
  }

  /**
   * Safe getter to retrieve the current active provider instance
   */
  public getActiveProvider(): PaymentProvider {
    this.updateProviderFromConfig();
    return this.activeProvider;
  }

  /**
   * Dynamically change the payment provider at runtime if required
   */
  public setProvider(provider: PaymentProvider): void {
    console.log(`[PaymentService] Switching payment provider to: ${provider.name}`);
    this.activeProvider = provider;
  }

  /**
   * Get the name of current active provider
   */
  public getProviderName(): string {
    return this.getActiveProvider().name;
  }

  /**
   * Create a single payment session or transaction
   */
  public async createPayment(data: CreatePaymentDTO): Promise<PaymentResponse> {
    const provider = this.getActiveProvider();
    console.log(`[PaymentService] Delegating payment creation to: ${provider.name}`);
    return provider.createPayment(data);
  }

  /**
   * Read status of a payment transaction
   */
  public async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    const provider = this.getActiveProvider();
    console.log(`[PaymentService] Requesting status for ID: ${paymentId} via ${provider.name}`);
    return provider.getPaymentStatus(paymentId);
  }
}

// Export as a singleton service
export const paymentService = new PaymentService();
export * from "./PaymentProvider";
