// Length of the app-managed (no-card) free trial, granted at signup.
export const TRIAL_DAYS = 7;

export const PAYMENT_PRODUCTS = {
  monthly: {
    id: 'pdt_0NgwVnompvPbDhMla1TPa',
    name: 'Premium Plan',
    price: 499,
    description: 'Unlock premium features',
    // 0 — the trial is granted by us at signup (no-card model). Dodo's
    // subscription starts and charges immediately at checkout, so it must NOT
    // add its own trial on top.
    trial_days: 0,
  },
};

export interface CheckoutSessionParams {
  productId: string;
  email: string;
  name: string;
  userId: string;
  returnUrl: string;
}
