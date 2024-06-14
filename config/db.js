const dotenv = require("dotenv");
const mysql = require("mysql");
dotenv.config();

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
});

connection.connect((error) =>{
    if(error) return console.log(error);
    console.log("connection successful");
});

module.exports = connection;