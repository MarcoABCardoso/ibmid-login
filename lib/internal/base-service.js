const axios = require('axios')

class BaseService {

    constructor(requestApi = axios) {
        this.requestApi = requestApi
    }

    async baseRequest(options) {
        return this.requestApi(options)
    }

}

BaseService.default = new BaseService()

module.exports = BaseService