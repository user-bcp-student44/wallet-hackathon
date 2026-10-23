# Tasks

## 1. Backend y contrato KYC

- [ ] 1.1 Configurar `MOCK_BASE_URL` y el escenario KYC de demo, con `APPROVED` por defecto; verificar mediante pruebas de configuración que el cliente no codifique una URL de grupo.
- [ ] 1.2 Definir y persistir el estado del flujo en H2 (o consumir el esquema de Datos si ese rol está activo), incluyendo protección contra envíos KYC repetidos; verificar transiciones permitidas y reenvío de una misma sesión con pruebas de repositorio/servicio.
- [ ] 1.3 Implementar la validación local del OTP fijo `123456` solo en el perfil de demo; verificar aceptación/rechazo con pruebas unitarias y comprobar que el código y el teléfono no aparecen en logs ni eventos.
- [ ] 1.4 Implementar el adaptador HTTP Java 17 para crear, consultar y resolver KYC según `docs/openapi.json`; verificar payloads `TEST` y respuestas `APPROVED`, `MANUAL_REVIEW`, `REJECTED`, `503`, `404` y `409` con un servidor HTTP de prueba.
- [ ] 1.5 Implementar los endpoints propios de onboarding y la traducción de errores; verificar con pruebas REST que un OTP inválido no llama al mock, que la revisión manual se resuelve mediante el mock y que solo el estado aprobado activa la wallet.
- [ ] 1.6 Documentar configuración, endpoints propios, estados, manejo de timeout y comandos de pruebas del backend; verificar que los comandos documentados se ejecutan en `output/backend-quarkus`.

## 2. Flujo frontend

- [x] 2.1 Configurar un runner de pruebas compatible con Angular 17; verificar que el comando `npm test` ejecuta la suite sin depender del backend ni del mock.
- [x] 2.2 Implementar las tres etapas confirmadas: celular/OTP, datos KYC `TEST` y resultado; verificar con pruebas de componentes el progreso, las validaciones y los mensajes accionables.
- [x] 2.3 Integrar el frontend con los endpoints propios del backend y mostrar `ACTIVE`, `PENDING` y `REJECTED`; verificar con pruebas de componentes el estado aprobado, pendiente, rechazado y el error recuperable de KYC.
- [x] 2.4 Permitir resolver `MANUAL_REVIEW` desde la misma vista de resultado con `ACTIVE` o `REJECTED`; verificar que la acción actualiza el estado visible y no aparece una consola independiente.
- [ ] 2.5 Documentar cómo ejecutar la demo y usar los datos de prueba; verificar `npm run build` y completar una revisión manual responsive en un viewport de smartphone y otro de escritorio.

## 3. Eventos y medición

- [ ] 3.1 Registrar eventos de inicio, finalización de paso, envío y cierre con ID de flujo y timestamps UTC; verificar con pruebas que eventos y logs excluyan OTP, teléfono y documento.
- [ ] 3.2 Calcular la duración desde el inicio hasta el envío correcto de todos los pasos y reportar aparte KYC y activación; verificar con reloj controlado que espera KYC/activación no altera la duración y que flujos incompletos no entran en la mediana.
- [ ] 3.3 Documentar nombres, propiedades mínimas de eventos, fórmula de duración y límites de la métrica; verificar ejemplos contra las pruebas de medición y mantener MAU/CAC fuera del reporte de demo.

## 4. Verificación integral

- [ ] 4.1 Ejecutar pruebas de extremo a extremo para OTP correcto/incorrecto, KYC aprobado, rechazo, revisión manual resuelta y proveedor no disponible; verificar resultados visibles y que no se creen pagos.
- [ ] 4.2 Ejecutar `mvn test` en `output/backend-quarkus`, `npm test` y `npm run build` en `output/frontend-angular`; registrar los resultados reales y corregir cualquier fallo antes de considerar la change lista.