let express = require('express');//Bring in express
let app = express();//Create express object
let path = require('path');//Bring in path
const port = process.env.PORT || 3000;//Specify the port
let security = false;

const session = require('express-session');
const bodyParser = require('body-parser');
app.set('view engine', 'ejs'); //Tell express we use ejs
app.set('views', path.join(__dirname, 'views')); //Set path where to get ejs views folder
app.use(express.urlencoded({extended: true})); //Pull things out from input in HTML forms

app.use(express.static(path.join(__dirname, 'public')));//Set path to public/images folder

// Connect to pgAdmin
const knex = require('knex') ({
    client : 'pg',
    connection : {
        host : process.env.RDS_HOSTNAME || 'localhost',
        user : process.env.RDS_USERNAME || 'postgres',
        password: process.env.RDS_PASSWORD || 'byhisgrace', // Make sure to change password and database name
        database : process.env.RDS_DB_NAME || 'Turtle-Shell-INTEX',
        port : process.env.RDS_PORT || 5432,
        ssl : process.env.DB_SSL ? {rejectUnauthorized: false} : false
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

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === user.username && password === user.password) {
        req.session.loggedIn = true;
        res.redirect('/landing');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

app.get('/landing', isAuthenticated, (req, res) => {
    res.render('landing', { username: user.username });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Listening on port 3000
app.listen(port, () => console.log("Listening"))