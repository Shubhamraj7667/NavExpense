const express = require("express");
const app = express();
const session = require('express-session');


app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.set("view engine", "ejs");

const connection = require("./config/db");

app.use(express.static(__dirname + "/public" ));
app.use(express.static(__dirname + "/views" ));

app.get("/test", (req,res)=>{

    res.redirect("./login.html");
});

app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
  }));

app.get("/register", (req,res)=>{
    res.render("register.ejs")
    // res.redirect("./register.html")
});

app.get("/profile", (req,res)=>{

    console.log( req.session.userid);

    connection.query("SELECT * FROM `user_info` LEFT JOIN user_detail ON user_info.id = user_detail.user_id WHERE user_info.id = ?",[req.session.userid], function(err,rows){
        if(err){
            res.send(err)
        }else{
            console.log(rows.name);
            // res.render("read.ejs", {rows})
            res.render("profile.ejs", {rows})
        }
    } )
    // res.redirect("./profile.html")
});

//create operation
app.post("/create", (req,res)=>{
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;

    connection.query("INSERT INTO user_info(name,email,user_name,password) values(?,?,?,?) ", [name,email,username,password],function(err,row){
        if(err){
            res.send({status: 500, message: err})
        }else{
            const lastInsertedId = row.insertId;
            connection.query("INSERT INTO user_detail (user_id) values(?)", [lastInsertedId],function (err) {
                if (err) {
                    return console.error('error inserting into user_detail: ' + err.stack);
                  }
                  console.log('Inserted user_id into user_detail:', lastInsertedId);
                
            })
            req.session.userid = lastInsertedId;

            res.send({status: 201, message: "Submitted",url: "/profile" })
        }
    })
})



app.listen(process.env.PORT || 3000, (err)=>{
    if(err)console.log(err);
    console.log(`connected success on port ${process.env.PORT}`);
})