const axios = require("axios")

class BaseService {

    constructor(sendRequest) {
        this.sendRequest = sendRequest
    }

    async baseRequest(options) {
        return this.sendRequest(options)
    }


}

BaseService.default = new BaseService(axios)

module.exports = BaseService