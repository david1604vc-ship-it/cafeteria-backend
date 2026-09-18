const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // SSL para bases de datos en la nube: DB_SSL=true y opcionalmente DB_CA_CERT con el certificado
  ...(process.env.DB_SSL === 'true' && {
    ssl: process.env.DB_CA_CERT
      ? { ca: process.env.DB_CA_CERT, minVersion: 'TLSv1.2' }
      : { minVersion: 'TLSv1.2', rejectUnauthorized: false }
  })
})

module.exports = pool