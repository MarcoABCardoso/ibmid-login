const jwt = require('jsonwebtoken')

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
const badPrivateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQDVlpDirK6Xz3UtvtP4Me8iMOrkcaJIpyiev71nKoA8mNhSwHSE
nPu3jJezCpOiABPMuaksBJbSXYu/dw0jvES1Z1np2+8S8UOOXHZMe83phxniERyu
csjFZMJqJszjijkqlNYiWlxhx3g8BNmW7NPPyScsj2ZEbyaU2rfvftmfIwIDAQAB
AoGAe0ermto27/LTXLMPX+tabm6ztWWNWMf63x4msVxLpi5GdgUVe9GsTHY+vR22
tsO6qejjpz+C2isaVUne8KhjMw9QNfobjiN0OMXelh7W8Et1ldiDWVr4EIhxoJkP
wZQo3pQKUEQZ2x3+J18SMlpjbSh5AiFGfxrnbDTlM0f7s8ECQQDvdTiZAWYZBozR
FpQ2IrMfRt05j7Xfqk85fbS8ACWS6GVGvdZ4nR5rX9HS9MA73Z+5v2fMaytsVBbO
0qMTTByhAkEA5FfXkirRunOQuGPQdq++9ee7je5KbWLwqPu0qUvxSSdZAnsMRRT3
monmLUEUMRTjjXOmBWM45Aadt4i+LuGBQwJAVtI3rTJWpGg9kmoPXvmB3KtC9uXm
WaxUgVHUv/2Fohhk8BtQsfa12tSpLUXUlWAr05tUtUd+PQ7YHjE9M3f7QQJBALPb
cQRD0ADB6Fsk292wnoSI7BVmfZ9dkFw6Ltou5DYP1S98BnUfh8xlFDXPDf1/C6Gu
VzXlKrmJcI9RGSRKIYsCQQCLi5JyypT/mRETF0GEsa9uf0QtB+jZnj9JjZYCrDWB
AOJYX3k7Gz5mPrkRVRO02FfxHLpfP/8WynkbhHU6a/uN
-----END RSA PRIVATE KEY-----
`
module.exports = {
    privateKey,
    publicKey,
    validToken: jwt.sign({ 'email': 'foo_user_email@allowed_domain.com', 'account': { 'bss': 'foo_account_guid' } }, privateKey, { algorithm: 'RS512' }),
    noAccessToken: jwt.sign({ 'email': 'foo_user_email@dangerous_domain.com', 'account': { 'bss': 'foo_forbidden_account_guid' } }, privateKey, { algorithm: 'RS512' }),
    noAccountsToken: jwt.sign({ 'email': 'foo_user_email@allowed_domain.com', 'account': { 'bss': 'foo_forbidden_account_guid' } }, privateKey, { algorithm: 'RS512' }),
    justAccountsToken: jwt.sign({ 'email': 'foo_user_email@dangerous_domain.com', 'account': { 'bss': 'foo_account_guid' } }, privateKey, { algorithm: 'RS512' }),
    invalidToken: jwt.sign({ 'email': 'foo_user_email@allowed_domain.com', 'account': { 'bss': 'foo_account_guid' } }, badPrivateKey, { algorithm: 'RS512' }),
}