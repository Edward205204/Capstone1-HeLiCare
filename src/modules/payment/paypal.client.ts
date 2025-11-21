import {
  Client,
  Environment,
  OrderRequest,
  OrderCaptureRequest,
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  OrdersController,
  AmountWithBreakdown
} from '@paypal/paypal-server-sdk'
import { env } from '~/utils/dot.env'

export class PayPalClient {
  private readonly client: Client
  private readonly ordersController: OrdersController

  constructor() {
    const clientId = env.PAYPAL_CLIENT_ID || ''
    const clientSecret = env.PAYPAL_CLIENT_SECRET || ''
    const environment = env.PAYPAL_ENVIRONMENT || '' 

    if (!clientId || !clientSecret) {
      console.warn('PayPal credentials not configured. PayPal payments will not work.')
    }

    // Initialize PayPal Client with proper configuration
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret
      },
      environment: environment === 'live' ? Environment.Production : Environment.Sandbox
    })

    // Initialize OrdersController with the client
    this.ordersController = new OrdersController(this.client)
  }

  async createOrder(params: {
    amount: number
    currency: string
    description: string
    custom_id: string
    return_url: string
    cancel_url: string
  }) {
    try {
      const amount: AmountWithBreakdown = {
        currencyCode: params.currency,
        value: params.amount.toFixed(2)
      }

      const request: OrderRequest = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: amount,
            description: params.description,
            customId: params.custom_id
          }
        ],
        applicationContext: {
          returnUrl: params.return_url,
          cancelUrl: params.cancel_url,
          brandName: 'HeliCare',
          landingPage: OrderApplicationContextLandingPage.Billing,
          userAction: OrderApplicationContextUserAction.PayNow
        }
      }

      const response = await this.ordersController.createOrder({
        body: request
      })

      if (response.statusCode === 201 && response.result) {
        return response.result
      }

      throw new Error('Failed to create PayPal order')
    } catch (error: any) {
      console.error('PayPal create order error:', error)
      throw new Error(`PayPal error: ${error.message || 'Unknown error'}`)
    }
  }

  async captureOrder(orderId: string) {
    try {
      const request: OrderCaptureRequest = {}

      const response = await this.ordersController.captureOrder({
        id: orderId,
        body: request
      })

      if (response.statusCode === 201 && response.result) {
        return response.result
      }

      throw new Error('Failed to capture PayPal order')
    } catch (error: any) {
      console.error('PayPal capture order error:', error)
      throw new Error(`PayPal error: ${error.message || 'Unknown error'}`)
    }
  }

  async getOrder(orderId: string) {
    try {
      const response = await this.ordersController.getOrder({
        id: orderId
      })

      if (response.statusCode === 200 && response.result) {
        return response.result
      }

      throw new Error('Failed to get PayPal order')
    } catch (error: any) {
      console.error('PayPal get order error:', error)
      throw new Error(`PayPal error: ${error.message || 'Unknown error'}`)
    }
  }
}
