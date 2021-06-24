const axios = require("axios")

class BaseService {

    static default = new BaseService(axios)

    constructor(sendRequest) {
        this.sendRequest = sendRequest
    }

    async baseRequest(options) {
        return this.sendRequest(options)
    }


}

module.exports = BaseService