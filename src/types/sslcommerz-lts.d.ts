declare module 'sslcommerz-lts' {
  export interface SSLCommerzInitOptions {
    total_amount: number | string;
    currency: string;
    tran_id: string;
    success_url: string;
    fail_url: string;
    cancel_url: string;
    ipn_url?: string;
    multi_card_name?: string;
    allowed_bin?: string;
    emi_option?: number;
    emi_max_inst_option?: number;
    emi_selected_inst?: number;
    cus_name: string;
    cus_email: string;
    cus_add1?: string;
    cus_add2?: string;
    cus_city?: string;
    cus_state?: string;
    cus_postcode?: string;
    cus_country?: string;
    cus_phone: string;
    cus_fax?: string;
    shipping_method: string;
    num_of_item?: number;
    ship_name?: string;
    ship_add1?: string;
    ship_add2?: string;
    ship_city?: string;
    ship_state?: string;
    ship_postcode?: string;
    ship_country?: string;
    product_name: string;
    product_category: string;
    product_profile: string;
    hours_till_departure?: string;
    flight_type?: string;
    pnr?: string;
    journey_from_to?: string;
    third_party_booking?: string;
    hotel_name?: string;
    length_of_stay?: string;
    check_in_time?: string;
    hotel_city?: string;
    product_type?: string;
    topup_number?: string;
    country_topup?: string;
    cart?: string;
    product_amount?: number | string;
    discount_amount?: number | string;
    convenience_fee?: number | string;
    value_a?: string;
    value_b?: string;
    value_c?: string;
    value_d?: string;
    [key: string]: unknown;
  }

  export interface SSLCommerzInitResponse {
    status: string;
    failedreason?: string;
    sessionkey?: string;
    GatewayPageURL?: string;
    storeBanner?: string;
    store_name?: string;
    [key: string]: unknown;
  }

  export interface SSLCommerzValidationResponse {
    status: string;
    tran_date?: string;
    tran_id?: string;
    val_id?: string;
    amount?: string;
    store_amount?: string;
    currency?: string;
    bank_tran_id?: string;
    card_type?: string;
    card_no?: string;
    card_issuer?: string;
    card_brand?: string;
    card_sub_brand?: string;
    card_issuer_country?: string;
    card_issuer_country_code?: string;
    store_id?: string;
    verify_sign?: string;
    verify_key?: string;
    verify_sign_sha2?: string;
    currency_type?: string;
    currency_amount?: string;
    currency_rate?: string;
    base_fair?: string;
    value_a?: string;
    value_b?: string;
    value_c?: string;
    value_d?: string;
    risk_level?: string;
    risk_title?: string;
    APIConnect?: string;
    validated_on?: string;
    gw_version?: string;
    error?: string;
    [key: string]: unknown;
  }

  export default class SSLCommerzPayment {
    constructor(store_id: string, store_passwd: string, live?: boolean);
    init(
      data: SSLCommerzInitOptions,
      url?: string | false,
      method?: string,
    ): Promise<SSLCommerzInitResponse>;
    validate(
      data: { val_id: string },
      url?: string | false,
      method?: string,
    ): Promise<SSLCommerzValidationResponse>;
    initiateRefund(
      data: Record<string, unknown>,
      url?: string | false,
      method?: string,
    ): Promise<unknown>;
    refundQuery(
      data: Record<string, unknown>,
      url?: string | false,
      method?: string,
    ): Promise<unknown>;
    transactionQueryBySessionId(
      data: { sessionkey: string },
      url?: string | false,
      method?: string,
    ): Promise<unknown>;
    transactionQueryByTransactionId(
      data: { tran_id: string },
      url?: string | false,
      method?: string,
    ): Promise<unknown>;
  }
}
