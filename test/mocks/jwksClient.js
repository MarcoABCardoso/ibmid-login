const publicKey = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCNs7q4uVwR7d1XeAVZ9fghAQEX
Y66+5dNewJ05TfXtkHAxF7Xsy73PIyf+u+geO2nOYgq/9skJhVoiRHx+nHBIylW6
ZLYbiAhKBVdFelB3O7D8FPEbNZ/fdXCbyOfaad9dAr+Ns6kCwNIaliSb6Z19/IIZ
+4U7St0lD/da02LAHwIDAQAB
-----END PUBLIC KEY-----
`
const privateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCNs7q4uVwR7d1XeAVZ9fghAQEXY66+5dNewJ05TfXtkHAxF7Xs
y73PIyf+u+geO2nOYgq/9skJhVoiRHx+nHBIylW6ZLYbiAhKBVdFelB3O7D8FPEb
NZ/fdXCbyOfaad9dAr+Ns6kCwNIaliSb6Z19/IIZ+4U7St0lD/da02LAHwIDAQAB
AoGAbf5tmqaHyYMSpasMvGAqU7Qr3LQMGTLdeFebs7fIhrfv3qvBFCazF+76RMon
zA/iecmw/oHaXAGfjaoL2Vwl666sFlNcp0Xi7YA9/j9NPhdojvnPX7+7Hq+pIJFD
zNurm0kaWNRNPS19Olg7kVWP22MowsRquNmVX9AGX8UxEwECQQDi1twoQCwmWPad
8JOGxJUlbkTLybp9VQ1qSs3FuqXERAR5sSgpLpMTtuqwkLItHccBCf0bzI5W142H
prqxNo5PAkEAn+sOYyx9zR9EFwdfPCdz6v17Afx0fbPcfyGygRTRnXjuOxauF6wl
tW1vUNXY+7zxOGYWcmTAapceAcg7l3CNMQJAEMs/eWtm2V/0wjSxd2TOdfr39O52
dBj76UaofV8YLrOqcSgAhSwBj5AXSAMubdCqjxUiPBCk6SEERWq+n6geWQJAQigT
w6NcR8dve7dpBpGrusMyaBfweTA3P8DI/+2E6ghlRbyUOObWkr+7FU3ifgIkKJjT
IG/dyjrKByK2xGejgQJBAMSuVbV1bZzRmaTeU25Mm9JI+IPoXowpM0mfNB7ELODH
XEP+JZSaqQXEWTOZ38oCXK4B+RmYKTDqGgMRaYMpVz4=
-----END RSA PRIVATE KEY-----
`
const mockJwksClient = {
    getSigningKey: (kid, cb) => cb(null, { publicKey }),
    publicKey, privateKey
}
module.exports = mockJwksClient