const axios = require('axios')

class BaseService {

    constructor(sendRequest=axios) {
        this.sendRequest = sendRequest
    }

    async baseRequest(options) {
        return this.sendRequest(options)
    }


}

BaseService.default = new BaseService()

module.exports = BaseService