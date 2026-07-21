# Autenticación y modelo de seguridad

## Flujo actual

1. El navegador envía email y contraseña por HTTPS a `POST /api/auth/login`.
2. El backend Next los reenvía al endpoint Azure B2C de LALIGA mediante ROPC.
3. La contraseña se descarta al terminar la petición y el formulario limpia su
   estado local.
4. El access token se guarda en `fantasy_session`, una cookie `HttpOnly`,
   `SameSite=Strict`, limitada al path `/` y marcada `Secure` en producción.
5. El proxy Fantasy lee esa cookie en el servidor y añade `Authorization` al
   upstream. El JavaScript del navegador no puede leer el token.
6. `DELETE /api/auth/session` elimina la cookie local.

Las respuestas de autenticación y de la API se marcan `Cache-Control: no-store`.
El código no registra credenciales, tokens ni cuerpos de error del proveedor.

## Limitaciones de ROPC

ROPC es un flujo legacy: la aplicación recibe la contraseña en su backend y no
es compatible con MFA ni con login social. Se mantiene porque LALIGA no ha
registrado un redirect URI para este proyecto.

El flujo interactivo social observado usa otro cliente y un callback oficial de
LALIGA. Añadir Google OAuth propio autenticaría al usuario en este proyecto,
pero no entregaría un token válido para la API Fantasy. No se debe presentar
como una solución equivalente.

Una integración social correcta requiere una de estas opciones:

- un client OAuth/partner y redirect URI registrados por LALIGA;
- un flujo oficial para aplicaciones de terceros;
- importación manual avanzada de una sesión, con validación de firma, issuer,
  audience y expiración. Esta última opción es frágil y no está implementada.

## CSP y cabeceras

`src/proxy.ts` genera un nonce aleatorio por request. La política permite scripts y
estilos propios con ese nonce, bloquea objetos y frames, restringe formularios y
conexiones al mismo origen, y añade `nosniff`, `no-referrer`, `DENY` y una
Permissions Policy restrictiva. En producción también se envía HSTS.

El uso de nonces obliga a renderizar las páginas dinámicamente. Es un coste
consciente para reducir el impacto de XSS sobre el flujo de autenticación.

## Responsabilidades del despliegue

- Terminar TLS correctamente y no exponer el servidor Next por HTTP público.
- Limitar intentos sobre `/api/auth/login` en el reverse proxy o proveedor.
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
