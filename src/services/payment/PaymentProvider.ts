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
  createPayment(data: CreatePaymentDTO): Promise<PaymentResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentResponse>;
}
