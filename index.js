// Import express
let express = require("express");
// Make express object for the website
let app = express();
// Import path
let path = require("path");
// Add security
let security = false
// This is the port we are listening on
const port = 3000;
// Tells express we are using ejs
app.set("view engine", "ejs");
// Sets the path where to get the ejs views folder
app.set("views", path.join(__dirname, "views"));
// Easier to pull things out from the input inside of HTML forms. The tag needs to have a name.
app.use(express.urlencoded({extended: true}));

// Use Knex class to get the methods. Connect to pgAdmin.
const knex = require("knex") ({
    client : "pg",
    connection : {
        host : "localhost",
        user : "postgres",
        // Change password and database name
        password : "byhisgrace",
        database : "starwars",
        port : 5432
    }
});

// Listening on port 3000
app.listen(port, () => console.log("Listening"))