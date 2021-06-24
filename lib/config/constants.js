const IAM_URL = process.env.IAM_URL || 'https://iam.cloud.ibm.com'
const ACCOUNTS_URL = process.env.ACCOUNTS_URL || 'https://accounts.cloud.ibm.com'
const ALLOWED_ACCOUNTS = JSON.parse(process.env.ALLOWED_ACCOUNTS || 'null')
const IAM_OPENID_CONFIG_CACHE_TIMEOUT = 3600000

module.exports = {
    IAM_URL,
    ACCOUNTS_URL,
    ALLOWED_ACCOUNTS,
    IAM_OPENID_CONFIG_CACHE_TIMEOUT
}