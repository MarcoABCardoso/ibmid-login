const BaseService = require('./base-service')
const { ACCOUNTS_URL, ALLOWED_ACCOUNTS } = require('../config/constants')


class AccountsAPI extends BaseService {
    listAccounts({ token }) {
        return this.baseRequest({
            url: `${ACCOUNTS_URL}/v1/accounts`,
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => {
                return ({
                    ...response.data,
                    resources: response.data.resources.filter(acc => !ALLOWED_ACCOUNTS || ALLOWED_ACCOUNTS.includes(acc.metadata.guid))
                })
            })
    }
}

AccountsAPI.default = new AccountsAPI()

module.exports = AccountsAPI