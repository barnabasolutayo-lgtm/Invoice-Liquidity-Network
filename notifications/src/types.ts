export type InvoiceStatus = "Pending" | "Funded" | "Paid" | "Defaulted";
export type ILNEventType = "submitted" | "funded" | "paid" | "defaulted";

export type NotificationTrigger =
  | "invoice_funded"
  | "invoice_paid"
  | "invoice_defaulted"
  | "invoice_due_soon"
  | "invoice_overdue";

export type SubscriptionChannel = "email" | "webhook";

export interface Invoice {
  id: number;
  freelancer: string;
  payer: string;
  amount: string;
  due_date: number;
  discount_rate: number;
  status: InvoiceStatus;
  funder: string | null;
  funded_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Subscription {
  id: number;
  stellar_address: string;
  channel: SubscriptionChannel;
  destination: string;
  triggers: NotificationTrigger[];
  created_at: number;
  webhook_secret?: string;
}

export interface WebhookDeliveryLog {
  id: number;
  subscription_id: number;
  event_id: string | null;
  trigger: NotificationTrigger;
  invoice_id: number;
  recipient_address: string;
  status: "pending" | "success" | "failed";
  attempts: number;
  response_status: number | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export interface NotificationPayload {
  trigger: NotificationTrigger;
  invoice: Invoice;
  recipientAddress: string;
  subject: string;
  message: string;
  actor: "freelancer" | "lp" | "payer";
  eventId?: string;
  eventType?: ILNEventType;
}
