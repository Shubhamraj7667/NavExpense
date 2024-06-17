const express = require("express");
const app = express();
const session = require('express-session');


app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");

const connection = require("./config/db");

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/views"));

app.get("/test", (req, res) => {

    res.redirect("./login.html");
});

app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
}));

app.get("/register", (req, res) => {
    res.render("register.ejs")
    // res.redirect("./register.html")
});

//for dashboard

app.get("/dashboard", (req, res) => {

    // connection.query(" SELECT user_info.*, user_credit.*, (SELECT SUM(amount) FROM user_credit WHERE user_id = ? AND transaction_type = 'credit') AS total_credit,(SELECT SUM(amount) FROM user_credit WHERE user_id = ? AND transaction_type = 'debit') AS total_debit FROM user_info  LEFT JOIN user_credit ON user_info.id = user_credit.user_id WHERE user_info.id = ?", [req.session.userid,req.session.userid,req.session.userid],function(err,rows){
    //     if(err){
    //         res.send({status: 500, message : err})
    //     }else{
    //         console.log(rows);
    //         res.render("dashboard.ejs", {rows})
    //     }
    // })


    const userId = req.session.userid;

    if (!userId) {

        res.redirect('/login');
    }

    // First query to get user info
    const userInfoQuery = "SELECT * FROM user_info WHERE id = ?";

    connection.query(userInfoQuery, [userId], (err, userInfoRows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('An error occurred while fetching user info.');
        }

        // Second query to get user credit information
        const userCreditQuery = "SELECT * FROM user_credit WHERE user_id = ?";

        connection.query(userCreditQuery, [userId], (err, userCreditRows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('An error occurred while fetching user credit info.');
            }

            // Initialize total credit and debit amounts
            let totalCredit = 0;
            let totalDebit = 0;
            let totalCreditGraph = [];
            let totalDebitGraph = [];
            let totalSevingGraph = [];
            let credit = 0;
            let debit = 0;


            // Loop through the user_credit rows to calculate totals
            userCreditRows.forEach(row => {

                if (row.transaction_type === 'credit') {
                    totalCredit += row.amount;
                    credit = row.amount;

                } else if (row.transaction_type === 'debit') {
                    totalDebit += row.amount;

                    debit = row.amount;
                }
                // totalCreditGraph.push(credit ?? 0);
                // totalDebitGraph.push(debit ?? 0);
                // totalSevingGraph.push(credit-debit);
            });

            connection.query("SELECT DATE(transaction_date) as transaction_date, SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as totalCredit, SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as totalDebit FROM user_credit WHERE user_id = ? GROUP BY DATE(transaction_date) ORDER BY DATE(date)", [req.session.userid], function (err, graphData) {
                if (err) {
                    res.send({ status: 500, message: err });
                } else {
                    let dates = [];

                    // console.log(userInfoRows);
                    // console.log(userCreditRows);
                    // console.log('Total Credit:', totalCredit);



                    graphData.forEach(row => {
                        console.log('Total Debit:', row);
                        dates.push(new Date(row.transaction_date).toISOString().split('T')[0]);
                        totalCreditGraph.push(row.totalCredit);
                        totalDebitGraph.push(row.totalDebit);
                        totalSevingGraph.push(row.totalCredit - row.totalDebit);
                    });
                    console.log('dates: ----', dates);
                    // Render the dashboard.ejs template with the user info, credit info, and totals
                    res.render("dashboard.ejs", {
                        totalSevingGraph: totalSevingGraph,
                        totalDebitGraph: totalDebitGraph,
                        totalCreditGraph: totalCreditGraph,
                        rows: userInfoRows,
                        userCredit: userCreditRows,
                        totalCredit: totalCredit,
                        totalDebit: totalDebit,
                        dates: dates

                    })
                }



            });
        });
    });


})





//for expense

app.get("/expense", (req, res) => {
    connection.query("SELECT * FROM `user_info` WHERE user_info.id = ?", [req.session.userid], function (err, rows) {
        if (err) {
            res.send(err)
        } else {
            console.log(rows);
            // res.render("read.ejs", {rows})
            res.render("expense.ejs", { rows })
        }
    })
})


// for login
app.get("/login", (req, res) => {
    res.render("login.ejs");
})





// for inserting expense data
app.post("/credit", (req, res) => {
    var amount = req.body.amount;
    var transaction_type = req.body.transaction_type;
    var comment = req.body.comment;
    var userid = req.body.userid;
    var transaction_date = req.body.transaction_date;

    console.log(userid);

    connection.query("INSERT INTO user_credit(amount,transaction_type,comment,user_id,transaction_date)  values(?,?,?,?,?)", [amount, transaction_type, comment, userid, transaction_date], function (err, rows) {
        if (err) {
            res.send({ status: 500, message: err })
        } else
            res.send({ status: 201, message: "Updated", url: "/dashboard" })
    })

})



//for profile

app.get("/profile", (req, res) => {

    // var LocalStorage = require('node-localstorage').LocalStorage,
    // localStorage = new LocalStorage('./scratch');
    // console.log( req.session.userid, localStorage);

    connection.query("SELECT * FROM `user_info` LEFT JOIN user_detail ON user_info.id = user_detail.user_id WHERE user_info.id = ?", [req.session.userid], function (err, rows) {
        if (err) {
            res.send(err)
        } else {
            console.log(rows);
            // res.render("read.ejs", {rows})
            res.render("profile.ejs", { rows })
        }
    })
    // res.redirect("./profile.html")
});

//create operation
app.post("/create", (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;

    connection.query("INSERT INTO user_info(name,email,user_name,password) values(?,?,?,?) ", [name, email, username, password], function (err, rows) {
        if (err) {
            res.send({ status: 500, message: err })
        } else {
            const lastInsertedId = rows.insertId;
            connection.query("INSERT INTO user_detail (user_id) values(?)", [lastInsertedId], function (err) {
                if (err) {
                    return console.error('error inserting into user_detail: ' + err.stack);
                }
                console.log('Inserted user_id into user_detail:', lastInsertedId);

            })
            req.session.userid = lastInsertedId;
            // sessionStorage.setItem(“currentloggedin”,username);
            // localStorage.setItem('userid',lastInsertedId);

            res.send({ status: 201, message: "Submitted", url: "/profile", userId: lastInsertedId })
        }
    })
})

//edit operation

app.post("/edit", (req, res) => {
    var name = req.body.name;
    var about = req.body.about;
    var phone = req.body.phone;
    var email = req.body.email;
    var twitter = req.body.twitter;
    var instagram = req.body.instagram;
    var userid = req.body.userid;
    var username = req.body.username;



    connection.query("UPDATE user_detail SET about =?,phone = ?,instagram = ?,twitter = ? WHERE user_id = ?", [about, phone, instagram, twitter, userid], function (err, rows) {
        if (err) {
            res.send({ status: 500, message: err })
        } else {
            connection.query("UPDATE user_info SET name = ?,email= ?, user_name =? WHERE id = ? ", [name, email, username, userid], function (err, rows) {
                if (err) {
                    return console.error('error inserting into user_detail: ' + err.stack);
                }
                console.log('Updated Successfully');
            })
            res.send({ status: 201, message: "Updated", url: "/profile" })
        }
    })
})

// for logging in

app.post("/auth", (req, res) => {
    var email = req.body.email;
    var password = req.body.password;
    let userId = 0;

    connection.query("SELECT id from user_info WHERE email = ? AND password = ?", [email, password], function (err, rows) {
        if (err) {
            res.send({ status: 500, message: err });
        } else {
            if (rows.length > 0) {
                const userId = rows[0].id;
                req.session.userid = rows[0].id;
                res.send({ status: 201, message: "Logged-in Successfully", url: "/profile", userId: userId })
            } else {
                res.send({ status: 401, message: 'Invalid email or password' });
            }
        }
    })
})

//for graph

app.get("/graph", (req, res) => {
    connection.query("SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month, SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) AS total_debit, SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) AS total_credit FROM user_credit WHERE user_id = ? GROUP BY month ORDER BY month; ", [req.session.userid], function (err, rows) {
        if (err) {
            res.send({ status: 500, message: err });
        } else {
            res.status(201).json({ 'status': 200, 'data': rows });
        }
    });
})




app.listen(process.env.PORT || 3000, (err) => {
    if (err) console.log(err);
    console.log(`connected success on port ${process.env.PORT}`);
})