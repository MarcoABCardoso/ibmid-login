const BaseService = require('./base-service')
const { ACCOUNTS_URL } = require('../config/constants')


class AccountsAPI extends BaseService {
    listAccounts({ token }) {
        return this.baseRequest({
            url: `${ACCOUNTS_URL}/v1/accounts`,
            headers: { Authorization: `Bearer ${token}` }
        })
    }
}

AccountsAPI.default = new AccountsAPI()

module.exports = AccountsAPI