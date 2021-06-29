const BaseService = require('./base-service')
const { ACCOUNTS_URL, ALLOWED_ACCOUNTS } = require('../config/constants')


class AccountsAPI extends BaseService {
    listAccounts(options) {
        return this.baseRequest({
            url: `${ACCOUNTS_URL}/v1/accounts`,
            headers: { Authorization: `Bearer ${options.token}` }
        })
            .then(response => ({
                ...response.data,
                resources: response.data.resources.filter(acc => !ALLOWED_ACCOUNTS || ALLOWED_ACCOUNTS.includes(acc.metadata.guid))
            }))
    }
}

AccountsAPI.default = new AccountsAPI()

module.exports = AccountsAPI