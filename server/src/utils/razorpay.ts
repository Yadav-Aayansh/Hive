import crypto from "node:crypto";
import { env } from "../config/env";
import { ServiceUnavailableError } from "./AppError";

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

const SIGNATURE_BYTES = 32;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

function authHeader(): string {
  const pair = `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(pair).toString("base64")}`;
}

export async function createOrder(amount: number): Promise<RazorpayOrder> {
  let response: Response;

  try {
    response = await fetch(ORDERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({ amount, currency: "INR" }),
    });
  } catch {
    throw new ServiceUnavailableError("Could not reach the payment gateway");
  }

  if (!response.ok) {
    throw new ServiceUnavailableError("The payment gateway rejected the order");
  }

  return (await response.json()) as RazorpayOrder;
}

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest();

  const received = Buffer.from(signature, "hex");

  if (received.length !== SIGNATURE_BYTES) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}
