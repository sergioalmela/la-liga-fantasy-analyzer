import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSignInPage } from '../src/lib/laliga-form-login.ts'

const page = `<script>
var SETTINGS = {
  "csrf": "Y3NyZg==",
  "transId": "StateProperties=eyJUSUQiOiIxIn0",
  "api": "CombinedSigninAndSignup",
  "hosts": {
    "tenant": "/laligadspprob2c.onmicrosoft.com/B2C_1A_5ULAIP_PARAMETRIZED_SignIn",
    "policy": "B2C_1A_5ULAIP_PARAMETRIZED_SignIn"
  }
};
var SA_FIELDS = {
  "AttributeFields": [
    { "ID": "signInName", "DN": "LOGIN-0003", "USER_INPUT_TYPE": "TextBox" },
    { "ID": "password_login", "DN": "LOGIN-0004", "USER_INPUT_TYPE": "Password" }
  ]
};
</script>`

test('reads the B2C transaction and field names from the sign-in page', () => {
  assert.deepEqual(parseSignInPage(page), {
    csrf: 'Y3NyZg==',
    transId: 'StateProperties=eyJUSUQiOiIxIn0',
    tenantPath:
      '/laligadspprob2c.onmicrosoft.com/B2C_1A_5ULAIP_PARAMETRIZED_SignIn',
    policy: 'B2C_1A_5ULAIP_PARAMETRIZED_SignIn',
    api: 'CombinedSigninAndSignup',
    usernameField: 'signInName',
    passwordField: 'password_login',
  })
})

test('rejects pages without the expected settings', () => {
  assert.equal(parseSignInPage('<html></html>'), null)
  assert.equal(parseSignInPage(page.replace('"csrf": "Y3NyZg==",', '')), null)
  assert.equal(
    parseSignInPage(page.replace('"USER_INPUT_TYPE": "Password"', '"X": 1')),
    null
  )
})
