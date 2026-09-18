// Importa db/dump.sql a la base de datos MySQL en la nube (Aiven u otro proveedor)
// Uso:  DB_URI="mysql://usuario:contrasena@host:puerto/defaultdb" node scripts/import-cloud.js
const fs   = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
  const uri = process.env.DB_URI
  if (!uri) {
    console.error('Falta la variable DB_URI (mysql://usuario:pass@host:puerto/db)')
    process.exit(1)
  }

  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'dump.sql'), 'utf8')

  // Aiven requiere TLS; si el servicio usa CA propia, añade CA_CERT_PATH=db/ca.pem
  const caPath = process.env.CA_CERT_PATH
  const ssl = caPath
    ? { ca: fs.readFileSync(path.join(__dirname, '..', caPath), 'utf8') }
    : { rejectUnauthorized: false }

  console.log('Conectando a la base de datos en la nube...')
  const conn = await mysql.createConnection({ uri, ssl, multipleStatements: true })
  console.log('✓ Conectado. Importando db/dump.sql ...')

  await conn.query(sql)

  const [tablas] = await conn.query('SHOW TABLES FROM `cafeteria_itlc`')
  console.log('Tablas creadas:', tablas.map(t => Object.values(t)[0]).join(', '))

  const [prod] = await conn.query('SELECT COUNT(*) n FROM `cafeteria_itlc`.`productos`')
  const [usr]  = await conn.query('SELECT COUNT(*) n FROM `cafeteria_itlc`.`usuarios`')
  console.log(`✓ productos: ${prod[0].n} · usuarios: ${usr[0].n}`)

  await conn.end()
  console.log('✅ Importación completa')
}

main().catch(e => {
  console.error('ERROR:', e.code || '', e.message)
  process.exit(1)
})
