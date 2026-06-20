import { PaymentProvider, CreatePaymentDTO, PaymentResponse } from "./PaymentProvider";

// Define TypeScript interfaces for CdvPurchase to ensure compile safety without external @types/cordova-plugin-purchase dependency
interface CdvPurchaseTransaction {
  id: string;
  verify(): void;
}

interface CdvPurchaseReceipt {
  finish(): void;
}

interface CdvPurchaseStore {
  register(products: Array<{ id: string; type: string; platform: string }>): void;
  initialize(platforms: string[]): void;
  get(id: string): any;
  order(id: string): Promise<any>;
  when(): {
    approved(callback: (transaction: CdvPurchaseTransaction) => void): {
      verified(callback: (receipt: CdvPurchaseReceipt) => void): void;
    };
  };
}

export class GooglePlayBillingProvider implements PaymentProvider {
  public name = "Google Play Store Billing";
  private store: CdvPurchaseStore | null = null;
  private isInitialized = false;

  constructor() {
    this.setupStore();
  }

  private setupStore() {
    if (typeof window !== "undefined") {
      const globalStore = (window as any).CdvPurchase?.store;
      const CdvPurchase = (window as any).CdvPurchase;

      if (globalStore && CdvPurchase) {
        this.store = globalStore as CdvPurchaseStore;
        console.log("[GooglePlayBillingProvider] In-App Billing is supported and initialized.");
        
        try {
          // Register lifetime premium item
          this.store.register([
            {
              id: "premium_lifetime",
              type: CdvPurchase.ProductType?.NON_CONSUMABLE || "non-consumable",
              platform: CdvPurchase.Platform?.GOOGLE_PLAY || "google-play"
            }
          ]);

          this.isInitialized = true;
        } catch (e) {
          console.error("[GooglePlayBillingProvider] Configuration registration error:", e);
        }
      } else {
        console.warn("[GooglePlayBillingProvider] running in Simulation/Web preview. Native Billing not detected.");
      }
    }
  }

  /**
   * Safe getter for CdvPurchase instance
   */
  public getStoreInstance() {
    return this.store;
  }

  public async createPayment(data: CreatePaymentDTO): Promise<PaymentResponse> {
    if (!this.isInitialized || !this.store) {
      console.warn("[GooglePlayBillingProvider] SDK simulator mode activated (either Web or Emulator pending setup).");
      return this.createSimulatedPayment(data);
    }

    try {
      console.log("[GooglePlayBillingProvider] Executing order call for 'premium_lifetime'...");
      
      // Native order triggers the native Play Store bottom sheet sheet!
      await this.store.order("premium_lifetime");

      return {
        id: `gplay-pending-${Date.now()}`,
        status: "pending",
        statusDetail: "waiting_google_confirmation",
        paymentMethod: "card", // Representing Play Store stored payment profile
        amount: data.amount
      };
    } catch (err: any) {
      console.error("[GooglePlayBillingProvider] Purchase initiation failed:", err);
      return {
        id: `gplay-failed-${Date.now()}`,
        status: "rejected",
        paymentMethod: "card",
        amount: data.amount,
        errorMessage: err.message || "Erro ao invocar a tela de faturamento do Google Play."
      };
    }
  }

  public async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    if (paymentId.startsWith("sim-gplay-")) {
      return {
        id: paymentId,
        status: "approved",
        statusDetail: "accredited_simulated",
        paymentMethod: "card",
        amount: 49.90
      };
    }

    // Checking if receipt is already registered on native container
    if (!this.store) {
      throw new Error("Google Play SDK indisponível para consulta de recibos fora do App.");
    }

    try {
      const product = this.store.get("premium_lifetime");
      const isOwned = product && (product.owned || product.owned === true);

      return {
        id: paymentId,
        status: isOwned ? "approved" : "pending",
        statusDetail: isOwned ? "completed_receipt" : "waiting_receipt_activation",
        paymentMethod: "card",
        amount: 49.90
      };
    } catch (e: any) {
      console.error("[GooglePlayBillingProvider] Error retrieving receipt status:", e);
      throw e;
    }
  }

  private async createSimulatedPayment(data: CreatePaymentDTO): Promise<PaymentResponse> {
    const simulationId = `sim-gplay-${Date.now()}`;
    return {
      id: simulationId,
      status: "approved", // Instant simulation approve for intuitive testing
      statusDetail: "sandbox_approved",
      paymentMethod: "card",
      amount: data.amount
    };
  }
}
