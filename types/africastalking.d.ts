declare module 'africastalking' {
  interface AfricastalkingOptions {
    apiKey: string
    username: string
  }

  interface SmsMessage {
    to: string[]
    message: string
    from?: string
  }

  interface SmsResponse {
    SMSMessageData: {
      Message: string
      Recipients: Array<{
        statusCode: number
        number: string
        cost: string
        status: string
        messageId: string
      }>
    }
  }

  interface SmsService {
    send(message: SmsMessage): Promise<SmsResponse>
  }

  interface AfricastalkingInstance {
    SMS: SmsService
  }

  function Africastalking(options: AfricastalkingOptions): AfricastalkingInstance
  export default Africastalking
}
