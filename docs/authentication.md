# Autenticación y modelo de seguridad

## Flujo actual

LALIGA retiró en octubre de 2026 la política ROPC (`B2C_1A_ResourceOwnerv2`).
Ambos flujos usan ahora Authorization Code con PKCE contra
`B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN`, con el client de la app móvil y su
redirect `authredirect://com.lfp.laligafantasy`.

### Email y contraseña

1. El navegador envía email y contraseña por HTTPS a `POST /api/auth/login`.
2. `src/lib/laliga-form-login.ts` reproduce en el servidor la página de login
   de LALIGA: carga la URL de autorización, lee `SETTINGS` (CSRF, transacción,
   rutas) y `SA_FIELDS` (nombres de los campos), envía las credenciales a
   `SelfAsserted` y lee el código de la cabecera `location` del 302 de
   `confirmed`, sin seguirlo.
3. Canjea el código con el `code_verifier`, que nunca sale del servidor. La
   contraseña se descarta al terminar la petición.

Solo un 400 con código `AADB2Cxxxxx` se muestra como credenciales inválidas;
cualquier otro cambio de la página se trata como proveedor no disponible para
no culpar al usuario.

### Google y Apple

1. `POST /api/auth/authorize` genera `state` y `code_verifier`, los guarda en
   la cookie `fantasy_login` (`HttpOnly`, `SameSite=Strict`, path `/api/auth`,
   15 minutos) y devuelve la URL de autorización.
2. El usuario inicia sesión en la web de LALIGA en una pestaña nueva y copia
   desde la pestaña Red el valor `location` de la petición `confirmed`
   (`authredirect://com.lfp.laligafantasy/?state=...&code=...`).
3. `POST /api/auth/login` con `redirectUrl` valida el esquema y el `state` y
   canjea el código. Sin el verifier el código no sirve de nada.

### Sesión

- El token (access token si existe; si no, id token) se valida por issuer,
  audience y expiración y se guarda en `fantasy_session` (`HttpOnly`,
  `SameSite=Strict`, path `/`, `Secure` en producción, 24 h). El refresh token
  va en `fantasy_refresh` con path `/api` y hasta 90 días.
- `GET /api/auth/session` renueva el token cuando le quedan menos de cinco
  minutos, y el proxy Fantasy cuando le queda menos de uno. Las renovaciones
  concurrentes del mismo refresh token comparten una sola petición. Si LALIGA
  rechaza el refresh token se borran ambas cookies; un fallo temporal no.
- El proxy Fantasy añade `Authorization` al upstream. El JavaScript del
  navegador no puede leer ningún token.
- `DELETE /api/auth/session` elimina las tres cookies.

Las respuestas de autenticación y de la API se marcan `Cache-Control: no-store`.
El código no registra códigos, tokens ni cuerpos de error del proveedor.

## Limitaciones

El login de email depende de detalles internos de la página de LALIGA
(`SETTINGS`, `SA_FIELDS`, `SelfAsserted`, `confirmed`); si la rediseñan habrá
que adaptarlo. El flujo de Google y Apple no se puede automatizar y requiere
herramientas de desarrollo, así que en la práctica solo funciona desde un
navegador de escritorio; la sesión resultante dura hasta 90 días. Si Google se
queda en el selector de cuentas, suele bastar con una ventana privada.

## CSP y cabeceras

`src/proxy.ts` genera un nonce aleatorio por request. La política permite scripts y
estilos propios con ese nonce, bloquea objetos y frames, restringe formularios y
conexiones al mismo origen, y añade `nosniff`, `no-referrer`, `DENY` y una
Permissions Policy restrictiva. En producción también se envía HSTS.

El uso de nonces obliga a renderizar las páginas dinámicamente. Es un coste
consciente para reducir el impacto de XSS sobre el flujo de autenticación.

## Responsabilidades del despliegue

- Terminar TLS correctamente y no exponer el servidor Next por HTTP público.
- Conservar el límite local de 10 intentos/IP/5 minutos en `/api/auth/login`.
  El refresh token es una credencial de larga duración: no registres cookies
  ni cabeceras `Set-Cookie`.
  Con `TRUST_PROXY_IP=true`, Caddy debe sobrescribir `X-Real-IP` y Next no
  debe ser accesible directamente. El límite es por proceso, sin persistencia;
  varias réplicas o un CDN requieren adaptar esta frontera y el limitador.
- Proteger logs, snapshots, backups y herramientas APM.
- Mantener Node, Next y dependencias de seguridad actualizados.
- No añadir analítica o scripts de terceros sin actualizar y revisar la CSP.

Una cookie HttpOnly reduce el robo de tokens mediante XSS, pero no elimina el
riesgo de acciones iniciadas desde una página comprometida. La publicación de
jugadores limita ruta y body, exige un origen válido y muestra confirmación UI.
El resto de mutaciones requiere las mismas garantías y tests adicionales antes
de habilitarse.

## Referencias

- [Flujos de autenticación de Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/authentication-flows-app-scenarios)
- [Authorization Code con PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [CSP con nonces en Next.js](https://nextjs.org/docs/app/guides/content-security-policy)
