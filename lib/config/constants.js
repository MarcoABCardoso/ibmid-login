const IAM_URL = process.env.IAM_URL || 'https://iam.cloud.ibm.com'
const ACCOUNTS_URL = process.env.ACCOUNTS_URL || 'https://accounts.cloud.ibm.com'
const ALLOWED_ACCOUNTS = JSON.parse(`${process.env.ALLOWED_ACCOUNTS}`.replace('undefined', 'null'))
const RESOURCE_CONTROLLER_URL = process.env.RESOURCE_CONTROLLER_URL || 'https://resource-controller.cloud.ibm.com'
const GLOBAL_CATALOG_URL = process.env.GLOBAL_CATALOG_URL || 'https://globalcatalog.cloud.ibm.com'
const IAM_OPENID_CONFIG_CACHE_TIMEOUT = 3600000
const RESOURCE_SERVICE_CACHE_TIMEOUT = 30000
const GLOBAL_CATALOG_API_CACHE_TIMEOUT = 3600000


module.exports = {
    IAM_URL,
    ACCOUNTS_URL,
    ALLOWED_ACCOUNTS,
    RESOURCE_CONTROLLER_URL,
    GLOBAL_CATALOG_URL,

    RESOURCE_SERVICE_CACHE_TIMEOUT,
    GLOBAL_CATALOG_API_CACHE_TIMEOUT,
    IAM_OPENID_CONFIG_CACHE_TIMEOUT
}