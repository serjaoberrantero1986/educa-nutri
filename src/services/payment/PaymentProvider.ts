export interface PaymentGatewayConfig {
  active_payment_gateway?: string;
  payment_mode?: string;
  mercado_pago_public_key?: string;
  mercado_pago_access_token?: string;
  stripe_publishable_key?: string;
  stripe_secret_key?: string;
  paypal_client_id?: string;
  paypal_client_secret?: string;
}

export interface CreatePaymentDTO {
  amount: number;
  description: string;
  email: string;
  firstName: string;
  lastName: string;
  paymentMethod: "pix" | "card";
  token?: string; // Required for credit card tokenization
  installments?: number;
  issuerId?: string;
}

export interface PaymentResponse {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  statusDetail?: string;
  paymentMethod: "pix" | "card";
  amount: number;
  qrCode?: string; // QR Code string for Pix SVG/canvas
  qrCodeCopyPaste?: string; // Copia e Cola Pix key
  initPoint?: string; // Redirect line for cards/gateways if needed
  errorMessage?: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(data: CreatePaymentDTO, config?: PaymentGatewayConfig): Promise<PaymentResponse>;
  getPaymentStatus(paymentId: string, config?: PaymentGatewayConfig): Promise<PaymentResponse>;
}
