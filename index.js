// Import express
let express = require("express");
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
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

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'yourSecretKey', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dummy user credentials
const user = {
    username: 'admin',
    password: 'password123', // In production, use hashed passwords
};

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.loggedIn) {
        return next();
    }
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database for the user
        const user = await knex('users').where({ username }).first();

        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        // Compare the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (isPasswordValid) {
            req.session.loggedIn = true;
            req.session.username = username; // Store username in session
            res.redirect('/internalLanding');
        } else {
            res.render('login', { error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.render('login', { error: 'Something went wrong' });
    }
});

app.get('/landing', isAuthenticated, (req, res) => {
    res.render('landing', { username: req.session.username });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Listening on port 3000
app.listen(port, () => console.log("Listening"))