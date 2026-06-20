import { PaymentProvider, CreatePaymentDTO, PaymentResponse } from "./PaymentProvider";
import { MercadoPagoProvider } from "./MercadoPagoProvider";
import { GooglePlayBillingProvider } from "./GooglePlayBillingProvider";

class PaymentService {
  private activeProvider: PaymentProvider;

  constructor() {
    const isAndroidApp = typeof window !== "undefined" && 
      (window as any).Capacitor && 
      (window as any).Capacitor.getPlatform() === "android";

    if (isAndroidApp) {
      console.log("[PaymentService] Capacitor Android detected. Loading native Google Play Billing Provider.");
      this.activeProvider = new GooglePlayBillingProvider();
    } else {
      console.log("[PaymentService] Browser or Web detected. Loading Mercado Pago Provider.");
      this.activeProvider = new MercadoPagoProvider();
    }
  }

  /**
   * Safe getter to retrieve the current active provider instance
   */
  public getActiveProvider(): PaymentProvider {
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
    return this.activeProvider.name;
  }

  /**
   * Create a single payment session or transaction
   */
  public async createPayment(data: CreatePaymentDTO): Promise<PaymentResponse> {
    console.log(`[PaymentService] Delegating payment creation to: ${this.activeProvider.name}`);
    return this.activeProvider.createPayment(data);
  }

  /**
   * Read status of a payment transaction
   */
  public async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    console.log(`[PaymentService] Requesting status for ID: ${paymentId} via ${this.activeProvider.name}`);
    return this.activeProvider.getPaymentStatus(paymentId);
  }
}

// Export as a singleton service
export const paymentService = new PaymentService();
export * from "./PaymentProvider";
