// Exporta la base de datos completa (estructura + datos) a un archivo .sql portable
// Sin CREATE DATABASE ni USE: se importa en la BD que se cree en el nuevo hosting.
//
// Uso (lee las mismas variables que el backend: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL):
//   node scripts/export-cloud.js                       -> usa el .env (BD local)
//   DB_HOST=xxx.aivencloud.com DB_SSL=true DB_PASSWORD=xxx node scripts/export-cloud.js
//   node scripts/export-cloud.js --out backups/mi.sql  -> nombre de archivo personalizado

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
require('dotenv').config()

const argOut = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : null

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(process.env.DB_SSL === 'true' && { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } })
  })

  const [tables] = await conn.query('SHOW TABLES')
  const tableKey = Object.keys(tables[0] || {})[0]
  const names = tables.map(t => t[tableKey])

  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
  const outPath = argOut || path.join('backups', `backup-${ts}.sql`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })

  let sql = `-- Respaldo cafeteria_itlc generado ${new Date().toISOString()}\n-- Destino: importable en MariaDB/MySQL (sin CREATE DATABASE ni USE)\n\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n`
  let totalRows = 0
  const resumen = []

  for (const t of names) {
    const [[create]] = await conn.query(`SHOW CREATE TABLE \`${t}\``)
    sql += `DROP TABLE IF EXISTS \`${t}\`;\n${create['Create Table']};\n\n`

    const [rows] = await conn.query(`SELECT * FROM \`${t}\``)
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(',')
      const values = rows.map(r => {
        const vals = Object.values(r).map(v => conn.escape(v)).join(',')
        return `(${vals})`
      }).join(',\n')
      sql += `INSERT INTO \`${t}\` (${cols}) VALUES\n${values};\n\n`
    }
    totalRows += rows.length
    resumen.push(`  ${t}: ${rows.length} filas`)
    console.log(`  ✓ ${t} (${rows.length} filas)`)
  }

  sql += 'SET FOREIGN_KEY_CHECKS=1;\n'
  fs.writeFileSync(outPath, sql, 'utf8')
  await conn.end()

  console.log(`\n✅ Respaldo completo: ${outPath}`)
  console.log(`   ${names.length} tablas, ${totalRows} filas en total`)
  console.log(resumen.join('\n'))
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
