export interface AccountAddress {
    address1: string
    address2: string | null
    city: string
    country: string
    province: string
    postal_code: string
}

export interface AccountOwner {
    user_id: number | null
}

export interface UsageLimits {
    starts_on: number
    per_campaign: number
    per_month: number
    remaining: number | null
    maximum_contacts: number
    lists: number
    users: number
    campaign_blueprints: number
    automation_conditions: number
    use_ab_split: boolean
    use_automation_conditions: boolean
    use_automations: boolean
    use_automation_customwebhooks: boolean
    use_behavioral_segmentation: boolean
    use_brand: boolean
    use_campaign_blueprints: boolean
    use_contact_export: boolean
    use_custom_merge_tags: boolean
    use_email_api: boolean
    use_html_editor: boolean
    use_list_redirection: boolean
    use_smart_email_resource: boolean
    use_smart_blueprint: boolean
    use_tags_in_automation: boolean
    use_tags: boolean
    insert_reseller_logo: boolean
}

export interface AccountOverrides {
    bypass_recaptcha: boolean
    inject_address: boolean
    inject_unsubscribe_link: boolean
}

export interface AccountMetadata {
    use_html_editor: boolean
    [key: string]: unknown
}

export interface Account {
    id: string
    lineage: string
    status: string
    name: string
    address: AccountAddress
    account_owner: AccountOwner
    fax: string | null
    phone: string | null
    website: string | null
    logo: string
    usage_limits: UsageLimits
    last_activity_on: number
    created_on: number
    partner: boolean
    organization: boolean
    stripe_customer_id: string
    overrides: AccountOverrides
    metadata: AccountMetadata
}

export interface AccountResponse {
    data: Account
}
