// Exporta la BD de Aiven y luego la importa a MariaDB de E-nova (conexión remota)
// Uso: node scripts/migrate-to-enova.js export   -> genera backups/aiven-final.sql
//      node scripts/migrate-to-enova.js import   -> importa a E-nova (variables ENOVA_* o .env)
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
require('dotenv').config()

const modo = process.argv[2] || 'export'

async function conectarAiven() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
  })
}

async function conectarEnova() {
  return mysql.createConnection({
    host: process.env.ENOVA_DB_HOST || 'cafeteria-2.com',
    port: Number(process.env.ENOVA_DB_PORT || 3306),
    user: process.env.ENOVA_DB_USER,
    password: process.env.ENOVA_DB_PASSWORD,
    database: process.env.ENOVA_DB_NAME,
    ssl: false
  })
}

async function exportar() {
  console.log('Conectando a Aiven...')
  const conn = await conectarAiven()
  const [tables] = await conn.query('SHOW TABLES')
  const key = Object.keys(tables[0] || {})[0]
  const names = tables.map(t => t[key])
  console.log(`Tablas encontradas: ${names.length}`)

  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
  const outPath = path.join('backups', `aiven-final-${ts}.sql`)
  fs.mkdirSync('backups', { recursive: true })

  let sql = `-- Respaldo Aiven -> E-nova ${new Date().toISOString()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n`
  let total = 0
  for (const t of names) {
    const [[create]] = await conn.query(`SHOW CREATE TABLE \`${t}\``)
    sql += `DROP TABLE IF EXISTS \`${t}\`;\n${create['Create Table']};\n\n`
    const [rows] = await conn.query(`SELECT * FROM \`${t}\``)
    if (rows.length) {
      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(',')
      const vals = rows.map(r => `(${Object.values(r).map(v => conn.escape(v)).join(',')})`).join(',\n')
      sql += `INSERT INTO \`${t}\` (${cols}) VALUES\n${vals};\n\n`
    }
    total += rows.length
    console.log(`  ✓ ${t}: ${rows.length} filas`)
  }
  sql += 'SET FOREIGN_KEY_CHECKS=1;\n'
  fs.writeFileSync(outPath, sql, 'utf8')
  await conn.end()
  console.log(`\n✅ Exportado: ${outPath} (${names.length} tablas, ${total} filas)`)
  return outPath
}

async function importar(archivo) {
  const sqlPath = archivo || (process.argv[3] || null)
  if (!sqlPath || !fs.existsSync(sqlPath)) {
    console.error('Uso: node scripts/migrate-to-enova.js import <archivo.sql>')
    process.exit(1)
  }
  console.log('Conectando a MariaDB de E-nova...')
  const conn = await conectarEnova()
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Dividir por statements respetando comillas simples
  const statements = []
  let buf = ''
  let inStr = false
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (c === "'" && sql[i - 1] !== '\\') inStr = !inStr
    if (c === ';' && !inStr) { if (buf.trim()) statements.push(buf.trim()); buf = '' } else buf += c
  }
  if (buf.trim()) statements.push(buf.trim())

  console.log(`Ejecutando ${statements.length} statements...`)
  let ok = 0
  for (const st of statements) {
    try { await conn.query(st); ok++ } catch (e) {
      console.error(`  ⚠ error en: ${st.slice(0, 80)}... -> ${e.message}`)
    }
  }
  const [tablas] = await conn.query('SHOW TABLES')
  const k = Object.keys(tablas[0] || {})[0]
  console.log(`\n✅ Importado: ${ok}/${statements.length} statements OK, ${tablas.length} tablas en destino`)
  tablas.forEach(t => console.log(`  - ${t[k]}`))
  await conn.end()
}

async function main() {
  if (modo === 'export') await exportar()
  else if (modo === 'import') await importar()
  else console.error('Modo inválido: usa "export" o "import"')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
