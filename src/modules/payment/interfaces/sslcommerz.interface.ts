export interface SSLCommerzInitResponse {
  status: string;
  failedreason?: string;
  GatewayPageURL?: string;
  storeBanner?: string;
  store_name?: string;
}

export interface SSLCommerzCallbackPayload {
  tran_id?: string;
  val_id?: string;
  amount?: string;
  card_type?: string;
  store_amount?: string;
  card_no?: string;
  bank_tran_id?: string;
  status?: string;
  tran_date?: string;
  error?: string;
  currency?: string;
  card_issuer?: string;
  card_brand?: string;
  card_sub_brand?: string;
  card_issuer_country?: string;
  card_issuer_country_code?: string;
  store_id?: string;
  verify_sign?: string;
  verify_key?: string;
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
  APIConnect?: string;
  validated_on?: string;
  gw_version?: string;
}
