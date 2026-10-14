# Autenticación y modelo de seguridad

## Flujo actual

LALIGA retiró en octubre de 2026 la política ROPC (`B2C_1A_ResourceOwnerv2`)
que permitía enviar email y contraseña desde el backend. El login usa ahora
Authorization Code con PKCE contra `B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN`, con el
mismo client de la app móvil, por lo que admite cuentas de email, Google y
Apple.

1. `POST /api/auth/authorize` genera `state` y `code_verifier`, los guarda en
   la cookie `fantasy_login` (`HttpOnly`, `SameSite=Strict`, path `/api/auth`,
   15 minutos) y devuelve la URL de autorización con el `code_challenge`.
2. El navegador abre esa URL en una pestaña nueva y el usuario inicia sesión
   en la web de LALIGA. Esta aplicación nunca ve la contraseña.
3. LALIGA redirige a `authredirect://com.lfp.laligafantasy?code=...`, que el
   navegador no puede abrir. El usuario copia esa URL desde la pestaña Red de
   las herramientas de desarrollo y la pega en el login.
4. `POST /api/auth/login` valida el esquema y el `state`, y canjea el código
   con el `code_verifier`. El código es de un solo uso y caduca en minutos; sin
   el verifier, que nunca sale del servidor, no sirve de nada.
5. El token (access token si existe; si no, id token) se valida por issuer,
   audience y expiración y se guarda en `fantasy_session` (`HttpOnly`,
   `SameSite=Strict`, path `/`, `Secure` en producción, 24 h). El refresh
   token va en `fantasy_refresh` con path `/api` y hasta 90 días.
6. `GET /api/auth/session` renueva el token cuando le quedan menos de cinco
   minutos, y el proxy Fantasy cuando le queda menos de uno. Las renovaciones
   concurrentes del mismo refresh token comparten una sola petición. Si LALIGA
   rechaza el refresh token se borran ambas cookies; un fallo temporal no.
7. El proxy Fantasy añade `Authorization` al upstream. El JavaScript del
   navegador no puede leer ningún token.
8. `DELETE /api/auth/session` elimina las tres cookies.

Las respuestas de autenticación y de la API se marcan `Cache-Control: no-store`.
El código no registra códigos, tokens ni cuerpos de error del proveedor.

## Limitaciones

El redirect URI pertenece a la app móvil de LALIGA y no se puede registrar uno
propio, de ahí el paso manual de copiar la URL. Requiere herramientas de
desarrollo, así que en la práctica solo funciona desde un navegador de
escritorio; la sesión resultante dura hasta 90 días. Si Google se queda en el
selector de cuentas, suele bastar con repetir el proceso en una ventana
privada.

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
