export const PAYMENT_PRODUCTS = {
  monthly: {
    id: 'pdt_0NgwVnompvPbDhMla1TPa',
    name: 'Premium Plan',
    price: 499,
    description: 'Unlock premium features',
    trial_days: 14,
  },
};

export interface CheckoutSessionParams {
  productId: string;
  email: string;
  name: string;
  userId: string;
  returnUrl: string;
}
