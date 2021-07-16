const mockJwksClient = {
    getSigningKey: (kid, cb) => cb(null, {
        publicKey: `
-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgGjddEZznJsx3akoAoTZV0aa+7ZD
/Vmd1HGdEvUJ7MDFfTAmZZsWrEivkIOfp3r7ZiVlfMFlRd3DLwlLAyjMtMUJeR/9
BmuLV8g3jZ1/Neyg/xxGgJiUWcvh0Fu7DigE39TPK/VKRaE3kzrV+a6J8vVpRxzd
VdsoLcKGmuKjpyJ/AgMBAAE=
-----END PUBLIC KEY-----
    `})
}
module.exports = mockJwksClient