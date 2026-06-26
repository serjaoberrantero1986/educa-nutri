import { getApiUrl } from "../utils";

export interface CreatePaymentParams {
  amount: number;
  description: string;
  email: string;
  firstName: string;
  lastName: string;
  paymentMethod: "pix" | "card";
  token?: string;
  installments?: number;
  issuerId?: string;
}

export interface ClientPaymentResponse {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  statusDetail?: string;
  paymentMethod: "pix" | "card";
  amount: number;
  qrCode?: string;
  qrCodeCopyPaste?: string;
  initPoint?: string;
  errorMessage?: string;
}

export const createPaymentApi = async (params: CreatePaymentParams): Promise<ClientPaymentResponse> => {
  const response = await fetch(getApiUrl("/api/payments/create"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao criar transação de pagamento");
  }

  return await response.json();
};

export const getPaymentStatusApi = async (paymentId: string): Promise<ClientPaymentResponse> => {
  const response = await fetch(getApiUrl(`/api/payments/status/${paymentId}`));

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao consultar status da transação");
  }

  return await response.json();
};
export { paymentService } from "./payment/PaymentService";
